/* global Log, Module, moment, config */
/* Magic Mirror
 * Module: MMM-NetworkScanner
 *
 * By Ian Perrin http://ianperrin.com
 * MIT Licensed.
 */

 Module.register("MMM-NetworkScanner",{

     // Default module config.
    defaults: {
        devices: [],                    // an array of device objects e.g. { macAddress: "aa:bb:cc:11:22:33", name: "DEVICE-NAME", icon: "FONT-AWESOME-ICON"}
        showUnknown: true,              // shows devices found on the network even if not specified in the 'devices' option 
        showOffline: true,              // shows devices specified in the 'devices' option even when offline
        keepAlive: 180,                 // how long (in seconds) a device should be considered 'alive' since it was last found on the network
        updateInterval: 10,             // how often (in seconds) the module should scan the network
        residentList: { residents: [], 
                        arrive: {notification: 'REMOTE_ACTION', payload: {action: 'MONITORON'}},
                        dapart:  {notification: 'REMOTE_ACTION', payload: {action: 'MONITOROFF'}}, 
                       },// Command for entering
        debug: true,
    },

    // Subclass start method.
    start: function() {
        Log.info("Starting module: " + this.name);
   
        // variable for if anyone is home
        this.occupied = true;

        // variable for list of IP addresses
        this.IPAddresses = []
        console.log("devices: ", this.config.devices);
        for (var i=0; i<this.config.devices.length; i++) {
           var device = this.config.devices[i];
           console.log("Looking at: ", device);
           if ("ipAddress" in device) {
               this.IPAddresses.push(device);
               console.log("found device: ", device.name);
           };
        };


        console.log("IP ADDRESSES: ", this.IPAddresses);

        moment.locale(config.language);
        this.scanNetwork();
    },

    // Subclass getStyles method.
    getStyles: function() {
        return ['font-awesome.css'];
    },

    // Subclass getScripts method.
    getScripts: function() {
        return ["moment.js"];
    },

    // Subclass socketNotificationReceived method.
    socketNotificationReceived: function(notification, payload) {
        Log.info(this.name + " received a notification: " + notification);

        if (notification === 'IP_ADDRESS') {
//            console.log("recived the following IP_ADDRESS information:")
//            console.log(payload);
//            console.log("Network devices:");
//            console.log(this.networkDevices);
//            console.log(this.IPAddresses);

            for (var i=0; i < this.config.devices.length; i++) {
               var device = this.config.devices[i];
               if ("ipAddress" in device) {
                  if (payload.name === device.name) {
//                     console.log("Found the status of ", device.name);
                     device.online = payload.online;
                  };
               };

            };

            console.log("IP Adresses:");
            console.log(this.config.devices);
            

        };

        if (notification === 'MAC_ADDRESSES')
        {
            // No action if data is the same
            if (JSON.stringify(this.networkDevices) === JSON.stringify(payload))  {
                return;
            }


            // Build device status list
            this.networkDevices = [];
            for (var i = 0; i < payload.length - 1; i++) {

                var device = this.getDeviceByMacAddress(payload[i]);
                if (device) {
                    device.online = true;
                    device.lastSeen = moment();
                    this.networkDevices.push(device);
                }
            }

            // Add offline known devices
            if (this.config.showOffline) {
                for (var d = 0; d < this.config.devices.length; d++) {
                    var device = this.config.devices[d];
         
                    // Make sure we are using a device with a mac address
                    if ("macAddress" in device) {

                       for(var n = 0; n < this.networkDevices.length; n++){
                           if( this.networkDevices[n].macAddress.toUpperCase() === device.macAddress.toUpperCase()) {
                               n = -1;
                               break;
                           }
                       }
   
                       if (n != -1) {
                           if (device.lastSeen) {
                               device.online = (moment().diff(device.lastSeen, 'seconds') < this.config.keepAlive);
                               Log.info (this.name + " is keeping alive " + device.name + ". Last seen " + device.lastSeen.fromNow());
                           } else {
                               device.online = false;
                           }
                           this.networkDevices.push(device);
                       }
                   } else if ("ipAddress" in device) {
                        this.networkDevices.push(device)
                   }
                  
                }
            }

            // Sort list by known device names, then unknown device mac addresses
            this.networkDevices.sort(function(a, b) {
                var stringA = (a.name ? "_" + a.name : a.macAddress);
                var stringB = (b.name ? "_" + b.name : b.macAddress);

                return stringA.localeCompare(stringB);
            });


         

            // Send notification if user status has changed
            if (this.config.residentList.residents.length > 0) {
               var updatedOccupied = false;
               var residentsList = this.config.residentList

               Array.prototype.contains = function(element){
                  return this.indexOf(element) > -1;
               };

               var anyoneHome = 0;

               for (var i=0; i<this.networkDevices.length; i++) {
                  device = this.networkDevices[i];
                  var resident = residentsList.residents.contains(device.name);
                  if (resident) {
                     anyoneHome = anyoneHome + device.online;
                  };
               }

               console.log("# people home: ",anyoneHome)

               if (anyoneHome > 0) {
                  if (this.occupied==false) {
                     console.log("Someone has come home")
                     var command = residentsList.arrive;
                     this.sendNotification(command.notification, command.payload);
                     this.occupied=true;
                  };
               } else {
                  if (this.occupied==true) {
                     console.log("Everyone has left home");
                     var command = residentsList.depart;
                     this.sendNotification(command.notification, command.payload);
                     this.occupied=false;
                  };
               };

      
                  
            };
               

            this.updateDom();
        }
    }, 

    // Override dom generator.
    getDom: function() {
        //Log.info(this.name + " is updating the DOM");
        var wrapper = document.createElement("div");
        wrapper.classList.add("small");

        // Display a loading message
        if (!this.networkDevices) {
            wrapper.innerHTML = this.translate("LOADING");
            return wrapper;
        }

        // Display device status
        var deviceList = document.createElement("ul");
        deviceList.classList.add("fa-ul");
        for (var i = 0; i < this.networkDevices.length; i++) {
            var device = this.networkDevices[i];
            if (device) {

                // device list item
                var deviceItem = document.createElement("li");
                var deviceOnline = (device.online ? "bright" : "dimmed");
                deviceItem.classList.add(deviceOnline);
                
                // Icon 
                var icon =  document.createElement("i");
                icon.classList.add("fa-li", "fa", "fa-" + (device.icon ? device.icon : "question"));
                deviceItem.appendChild(icon);

                // Name 
                deviceItem.innerHTML += (device.name ? device.name: device.macAddress) ;

                deviceList.appendChild(deviceItem);  

            } else {
                Log.info("Online, but ignoring: '" + this.networkDevices[i] + "'");
            }
        }
        if(deviceList.hasChildNodes()) {
            wrapper.appendChild(deviceList);
        } else {
            // Display no devices online message
            wrapper.innerHTML = this.translate("NO DEVICES ONLINE");
        }

        return wrapper;
    },


    scanNetwork: function() {
        var self = this;
        var devices = this.config.devices;
        this.sendSocketNotification('SCAN_NETWORK', devices);
        setInterval(function() {
            self.sendSocketNotification('SCAN_NETWORK', devices);
        }, this.config.updateInterval * 1000);
    },

    getDeviceByMacAddress: function(macAddress) {

        // Find first device with matching macAddress
        for (var i = 0; i < this.config.devices.length; i++) {
            var device = this.config.devices[i];
            if ("macAddress" in device) {
               if (macAddress.toUpperCase() === device.macAddress.toUpperCase()){
                   return device;
               }
           }
        }

        // Return macAddress (if showing unknown) or null
        if (this.config.showUnknown) {
            return {macAddress: macAddress};
        } else {
            return null;
        }
    },
   
    sendNotifications: function() {
      console.log(this.networkDevices)
    }


});
