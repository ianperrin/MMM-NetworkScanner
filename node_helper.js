/* global require, module */
/* Magic Mirror
 * Node Helper: MMM-NetworkScanner
 *
 * By Ian Perrin http://ianperrin.com
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const ping = require("ping");
const sudo = require("sudo");

module.exports = NodeHelper.create({
    
    start: function function_name () {
        this.log("Starting module: " + this.name);
    },

    // Override socketNotificationReceived method.
    socketNotificationReceived: function(notification, payload) {
        this.log(this.name + " received " + notification);

        if (notification === "CONFIG") {
            this.config = payload;
            return true;
        }

        if (notification === "SCAN_NETWORK") {
            this.scanNetworkMAC();
            this.scanNetworkIP();
            return true;
        }

    },

    scanNetworkMAC: function() {
        this.log(this.name + " is performing arp-scan");

        var self = this;
        if( self.config.network.length ){
            var arp = sudo(['arp-scan', '-q', self.config.network]);
        } else {
            var arp = sudo(['arp-scan', '-l', '-q']);    
        }        
        var buffer = '';
        var errstream = '';
        var discoveredMacAddresses = [];
        var discoveredDevices = [];

        arp.stdout.on('data', function (data) {
            buffer += data;
        });

        arp.stderr.on('data', function (data) {
            errstream += data;
        });

        arp.on('error', function (err) {
            errstream += err;
        });

        arp.on('close', function (code) {
            if (code !== 0) {
                this.log(self.name + " received an error running arp-scan: " + code + " - " + errstream);
                return;
            }

            // Parse the ARP-SCAN table response
            var rows = buffer.split('\n');
            for (var i = 2; i < rows.length; i++) {
                var cells = rows[i].split('\t').filter(String);

                // Update device status
                if (cells && cells[1]) {
                    var macAddress = cells[1].toUpperCase()
                    if (macAddress && discoveredMacAddresses.indexOf(macAddress) === -1) {
                        discoveredMacAddresses.push(macAddress);
                        device = self.findDeviceByMacAddress(macAddress);
                        if (device) {
                            device.online = true;
                            discoveredDevices.push(device);
                        }
                    }
                }
            }

            self.log(self.name + " arp scan addresses: ", discoveredMacAddresses); 
            self.log(self.name + " arp scan devices: ", discoveredDevices); 
            self.sendSocketNotification("MAC_ADDRESSES", discoveredDevices);
        });

    },

    scanNetworkIP: function() {
        this.log(this.name + " is scanning for ip addresses", this.config.devices);

        var discoveredDevices = [];
        var self = this;
        this.config.devices.forEach( function(device) {
            self.log("Checking Device...");
            if ("ipAddress" in device) {
                self.log("pinging for ", device);
                ping.sys.probe(device.ipAddress, function(isAlive,err) {
                    self.log( isAlive );
                    self.log( err );
                    device.online = isAlive;
                    if (isAlive) {
                        discoveredDevices.push(device);
                    }
                    self.sendSocketNotification("IP_ADDRESS", device);
                });
            }
        });
        
        this.log(self.name + " ping results: ", discoveredDevices); 
           
    },

    findDeviceByMacAddress: function (macAddress) {
        // Find first device with matching macAddress
        for (var i = 0; i < this.config.devices.length; i++) {
            var device = this.config.devices[i];
            if (device.hasOwnProperty("macAddress")) {
                if (macAddress.toUpperCase() === device.macAddress.toUpperCase()){
                    this.log(this.name + " found device by MAC Address", device);
                    return device;
                }
            }
        }
        // Return macAddress (if showing unknown) or null
        if (this.config.showUnknown) {
            return {macAddress: macAddress, name: macAddress, icon: "question", type: "Unknown"};
        } else {
            return null;
        }
    },

    log: function(message, object) {
        // Log if config is message or in debug mode
        if (!this.config || this.config.debug) {
            if (object) {
                console.log(message, object);
            } else {
                console.log(message);
            }
        }
    },


});
