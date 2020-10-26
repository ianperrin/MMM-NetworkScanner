/* global require, module */
/* jshint esversion: 6 */
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
        // Target hosts/network supplied in config or entire localnet
        var arpHosts = this.config.network || '-l';
        var arp = sudo(['arp-scan', '-q', arpHosts]);
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
                self.log(self.name + " received an error running arp-scan: " + code + " - " + errstream);
            } else {
                // Parse the ARP-SCAN table response
                var rows = buffer.split('\n');
                for (var i = 2; i < rows.length; i++) {
                    var cells = rows[i].split('\t').filter(String);
    
                    // Update device status
                    if (cells && cells[1]) {
                        var macAddress = cells[1].toUpperCase();
                        if (macAddress && discoveredMacAddresses.indexOf(macAddress) === -1) {
                            discoveredMacAddresses.push(macAddress);
                            var device = self.findDeviceByMacAddress(macAddress);
                            if (device) {
                                device.online = true;
                                discoveredDevices.push(device);
                            }
                        }
                    }
                }
            }
            self.log(self.name + " arp scan addresses: ", discoveredMacAddresses); 
            self.log(self.name + " arp scan devices: ", discoveredDevices); 
            self.sendSocketNotification("MAC_ADDRESSES", discoveredDevices);
            return;
        });

    },

    scanNetworkIP: function() {
        if (!this.config.devices) {
            return;
        }
        
        this.log(this.name + " is performing ip address scan");

        var discoveredDevices = [];
        var self = this;
        this.config.devices.forEach( function(device) {
            self.log(self.name + " is checking device: ", device.name);
            if ("ipAddress" in device) {
                self.log(self.name + " is pinging ", device.ipAddress);
                ping.sys.probe(device.ipAddress, function(isAlive) {
                    device.online = isAlive;
                    self.log(self.name + " ping result: ", [device.name, device.online] );
                    if (device.online) {
                        discoveredDevices.push(device);
                    }
                    self.sendSocketNotification("IP_ADDRESS", device);
                });
            }
        });

    },

    findDeviceByMacAddress: function (macAddress) {
        // Find first device with matching macAddress
        var mac1 = macAddress.toUpperCase.split(":");
        for (var i = 0; i < this.config.devices.length; i++) {
            var device = this.config.devices[i];
            if (device.hasOwnProperty("macAddress")) {
                var mac2 = device.macAddress.toUpperCase.split(":");
                var equal = true;
                for (var j = 0; j < mac1.length; j++) {
                  equal = equal && ( mac1[j] === mac2[j] || mac2[j] === "*" )
                } 
                if (equal) {
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
        // Log if config is missing or in debug mode
        if (!this.config || this.config.debug) {
            if (object) {
                console.log(message, object);
            } else {
                console.log(message);
            }
        }
    },

});
