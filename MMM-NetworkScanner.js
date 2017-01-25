/* global Log, Module, moment, config */
/* Magic Mirror
 * Module: MMM-NetworkScanner
 *
 * By Ian Perrin http://ianperrin.com
 * MIT Licensed.
 */

//var Module, Log, moment, config, Log, moment, document;


Module.register("MMM-NetworkScanner", {

     // Default module config.
    defaults: {
        devices: [],                    // an array of device objects e.g. { macAddress: "aa:bb:cc:11:22:33", name: "DEVICE-NAME", icon: "FONT-AWESOME-ICON"}
        showUnknown: false,              // shows devices found on the network even if not specified in the 'devices' option 
        showOffline: true,              // shows devices specified in the 'devices' option even when offline
        keepAlive: 300,                 // how long (in seconds) a device should be considered 'alive' since it was last found on the network
        updateInterval: 30,             // how often (in seconds) the module should scan the network

        residents: [],
        residents: ["Ben"],
        occupiedCMD: {notification: 'TEST', payload: {action: 'occupiedCMD'}},
        vacantCMD:   {notification: 'TEST', payload: {action: 'vacantCMD'}},
        debug: true,
    },

    // Subclass start method.
    start: function () {
        var self = this;
        Log.info("Starting module: " + this.name);

        if ( this.config.debug) {
            console.log("Config settings for " + this.name);
            console.log(this.config);
        }

        // variable for if anyone is home
        this.occupied = true;

        // variable for list of IP addresses
        self.IPAddresses = [];
        this.config.devices.forEach(function (device) {
//        for (var i=0; i<this.config.devices.length; i++) {
//           var device = this.config.devices[i];
            if (device.hasOwnProperty("ipAddress")) {
                self.IPAddresses.push(device);
            }
        });

        moment.locale(config.language);
        this.scanNetwork();
    },

    // Subclass getStyles method.
    getStyles: function () {
        return ['font-awesome.css'];
    },

    // Subclass getScripts method.
    getScripts: function () {
        return ["moment.js"];
    },

    // Subclass socketNotificationReceived method.
    socketNotificationReceived: function (notification, payload) {
//        Log.info(this.name + " received a notification: " + notification);
//        console.log("with payload: " + payload);

        var self = this;

        if (notification === 'IP_ADDRESS') {

            this.config.devices.forEach(function (device) {
//            for (var i=0; i < this.config.devices.length; i++) {
//               var device = this.config.devices[i];
                if (device.hasOwnProperty("ipAddress")) {
                    if (payload.name === device.name) {
                        device.online = payload.online;
                        if (payload.online) {
                           device.lastSeen = moment();
                        }
                        return;
                    }
                }
            });
        }

        if (notification === 'MAC_ADDRESSES') {
            // No action if data is the same
            if (JSON.stringify(this.networkDevices) === JSON.stringify(payload)) {
                return;
            }


            // Build device status list
//            var that = this;
            self.networkDevices = [];

            payload.forEach(function (item) {
//            for (var i = 0; i < payload.length - 1; i++) {
//                var item = payload[i]
                var device = self.getDeviceByMacAddress(item);
                console.log("devices: " + device);
                if (device) {
                    device.online = true;
                    device.lastSeen = moment();
                    self.networkDevices.push(device);
                }
            });
            console.log(self.networkDevices)

            // Add offline known devices
            if (self.config.showOffline) {
                console.log("Adding offline devices: ");

                self.config.devices.forEach(function (device) {
//                for (var d = 0; d < this.config.devices.length; d++) {
//                    var device = this.config.devices[d];

//                    console.log("Looking at device: ");
//                    console.log(device);
                    // Make sure we are using a device with a mac address
                    if (device.hasOwnProperty("macAddress")) {

                        self.networkDevices.forEach(function (networkDevice) {
//                        for (var n = 0; n < this.networkDevices.length; n++){
//                            var networkDevice = networkDevices[n];

                            // Find if the device is a known device
                            if (networkDevice.hasOwnProperty("macAddress")) {
                                if (networkDevice.macAddress.toUpperCase() === device.macAddress.toUpperCase()) {
                                    if (device.lastSeen) {
                                        device.online = (moment().diff(device.lastSeen, 'seconds') < self.config.keepAlive);
                                        Log.info(self.name + " is keeping alive " + device.name + ". Last seen " + device.lastSeen.fromNow());
                                    } else {
                                        device.online = false;
                                    }
                                }
                            }
                            
                        });

                    } else if (device.hasOwnProperty("ipAddress")) {
                     // Keep the device alive incase of temporary loss

                        if (!device.online) {
                            console.log("device is not online");
                            if (device.lastSeen) {
                                device.online = (moment().diff(device.lastSeen, 'seconds') < self.config.keepAlive);
                                Log.info(self.name + " is keeping alive " + device.name + ". Last seen " + device.lastSeen.fromNow());
                            } else {
                                device.online = false;
                            }
                        }
                    }
                    self.networkDevices.push(device);
                });
            }

            // Sort list by known device names, then unknown device mac addresses
            this.networkDevices.sort(function (a, b) {
                var stringA, stringB;
                stringA = (a.name ? "_" + a.name : a.macAddress);
                stringB = (b.name ? "_" + b.name : b.macAddress);

                return stringA.localeCompare(stringB);
            });



            // Send notification if user status has changed
            if (self.config.residents.length > 0) {
                var anyoneHome, command;
//                self = this;
                anyoneHome = 0;


//              Array.prototype.contains = function (element) {
//                  return this.indexOf(element) > -1;
//              };


                this.networkDevices.forEach(function (device) {
//                for (var i=0; i<this.networkDevices.length; i++) {
//                    device = this.networkDevices[i];
                    if (self.config.residents.indexOf(device.name) >= 0) {
//                  if (self.config.residents.contains(device.name)) {
                        anyoneHome = anyoneHome + device.online;
                    }
                });

                console.log("# people home: ", anyoneHome);
                console.log("Was occupied? ", this.occupied);



                if (anyoneHome > 0) {
                    if (self.occupied === false) {
                        console.log("Someone has come home");
                        command = self.config.occupiedCMD;
                        self.sendNotification(command.notification, command.payload);
                        self.occupied = true;
                    }
                } else {
                    if (self.occupied === true) {
                        console.log("Everyone has left home");
                        command = self.config.vacantCMD;
                        self.sendNotification(command.notification, command.payload);
                        self.occupied = false;
                    }
                }
            }

            this.updateDom();
            return;

        }


    },

    // Override dom generator.
    getDom: function () {
        //Log.info(this.name + " is updating the DOM");
        var wrapper, deviceList, icon, deviceItem, deviceOnline, self;
        wrapper = document.createElement("div");

        self = this;


        wrapper.classList.add("small");

        // Display a loading message
        if (!this.networkDevices) {
            wrapper.innerHTML = this.translate("LOADING");
            return wrapper;
        }

        // Display device status
        deviceList = document.createElement("ul");
        deviceList.classList.add("fa-ul");
//        console.log("Network devices:");
//        console.log(self.networkDevices);
//        console.log(this.networkDevices);
        self.networkDevices.forEach(function (device) {
//        for (var i = 0; i < this.networkDevices.length; i++) {
//            var device = this.networkDevices[i];
            if (device) {

                // Add device items if they don't exist.
                if (!device.hasOwnProperty("icon")) {
                    device.icon = "question";
                }
                if (!device.hasOwnProperty("name")) {
                    if (device.hasOwnProperty("macAddress")) {
                        device.name = device.macAddress;
                    } else if (device.hasOwnProperty("ipAddress")) {
                        device.name = device.ipAddress;
                    } else {
                        device.name = "Unknown";
                    }
                }

                // device list item
                deviceItem = document.createElement("li");
                deviceOnline = (device.online ? "bright" : "dimmed");
                deviceItem.classList.add(deviceOnline);

                // Icon
                icon =  document.createElement("i");
                icon.classList.add("fa-li", "fa", "fa-" + device.icon);
                deviceItem.appendChild(icon);

                // Name 
                deviceItem.innerHTML += device.name;

                deviceList.appendChild(deviceItem);

            } else {
                Log.info("Online, but ignoring: '" + device + "'");
            }
        });
        if (deviceList.hasChildNodes()) {
            wrapper.appendChild(deviceList);
        } else {
            // Display no devices online message
            wrapper.innerHTML = this.translate("NO DEVICES ONLINE");
        }

        return wrapper;
    },


    scanNetwork: function () {
        var devices, self;
        self = this;
        devices = this.config.devices;
        this.sendSocketNotification('SCAN_NETWORK', devices);
        setInterval(function () {
            self.sendSocketNotification('SCAN_NETWORK', devices);
        }, this.config.updateInterval * 1000);
        return;
    },

    getDeviceByMacAddress: function (macAddress) {

        var self = this;

        // Find first device with matching macAddress
        self.config.devices.forEach(function (device) {
//        for (var i = 0; i < this.config.devices.length; i++) {
//            var device = this.config.devices[i];
            if (device.hasOwnProperty("macAddress")) {
                if (macAddress.toUpperCase() === device.macAddress.toUpperCase()) {
                    return device;
                }
            }
        });

        // Return macAddress (if showing unknown) or null
        if (self.config.showUnknown) {
            return {macAddress: macAddress};
        }
    },

});


