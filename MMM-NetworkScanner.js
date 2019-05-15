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
		devices: [], // an array of device objects e.g. { macAddress: "aa:bb:cc:11:22:33", name: "DEVICE-NAME", icon: "FONT-AWESOME-ICON"}
		network: "-l", // a Local Network IP mask to limit the mac address scan, i.e. `192.168.0.0/24`. Use `-l` for the entire localnet
		showUnknown: true, // shows devices found on the network even if not specified in the 'devices' option 
		showOffline: true, // shows devices specified in the 'devices' option even when offline
		showLastSeen: false, // shows when the device was last seen e.g. "Device Name - last seen 5 minutes ago"
		keepAlive: 180, // how long (in seconds) a device should be considered 'alive' since it was last found on the network
		updateInterval: 20, // how often (in seconds) the module should scan the network
		sort: true, // sort the devices in the mirror

		residents: [],
		occupiedCMD: null, // {notification: 'TEST', payload: {action: 'occupiedCMD'}},
		vacantCMD: null, // {notification: 'TEST', payload: {action: 'vacantCMD'}},

		colored: false, // show devices colorcoded with color defined in devices [] //
		coloredSymbolOnly: false, // show symbol only in color //
		showLastSeenWhenOffline: false, // show last seen only when offline //

		debug: false,
	},

	// Subclass start method.
	start: function() {
		Log.info("Starting module: " + this.name);
		if (this.config.debug) Log.info(this.name + " config: ", this.config);

		// variable for if anyone is home
		this.occupied = true;

		moment.locale(config.language);

		this.validateDevices();

		this.sendSocketNotification('CONFIG', this.config);

		this.scanNetwork();
	},

	// Subclass getStyles method.
	getStyles: function() {
		return ['MMM-NetworkScanner.css', 'font-awesome.css'];
	},

	// Subclass getScripts method.
	getScripts: function() {
		return ["moment.js"];
	},

	// Subclass socketNotificationReceived method.
	socketNotificationReceived: function(notification, payload) {
		if (this.config.debug) Log.info(this.name + " received a notification: " + notification, payload);

		var self = this;
		var getKeyedObject = (objects = [], key) => objects.reduce(
			(acc, object) => (Object.assign(acc, {
				[object[key]]: object
			})), {}
		);

		if (notification === 'IP_ADDRESS') {
			if (this.config.debug) Log.info(this.name + " IP_ADDRESS device: ", [payload.name, payload.online]);
			if (payload.hasOwnProperty("ipAddress")) {
				var device = this.config.devices.find(d => d.ipAddress === payload.ipAddress);
				this.updateDeviceStatus(device, payload.online);
			}
		}

		if (notification === 'MAC_ADDRESSES') {
			if (this.config.debug) Log.info(this.name + " MAC_ADDRESSES payload: ", payload);

			var nextState = payload.map(device =>
				Object.assign(device, {
					lastSeen: moment()
				})
			);

			if (this.config.showOffline) {
				var networkDevicesByMac = getKeyedObject(this.networkDevices, 'macAddress');
				var payloadDevicesByMac = getKeyedObject(nextState, 'macAddress');

				this.config.devices.forEach((d) => {
					if(!nextState.find(v => v.macAddress === d.macAddress)){
						nextState.push(d);
					}
				})
				nextState = nextState.map(device => {
					var definedDevice = this.config.devices.find(d => device.macAddress === d.macAddress)
					if(!definedDevice){
						return device;
					}
					if (definedDevice.macAddress) {
						var oldDeviceState = networkDevicesByMac[definedDevice.macAddress];
						var payloadDeviceState = payloadDevicesByMac[definedDevice.macAddress];
						var newDeviceState = payloadDeviceState || oldDeviceState || definedDevice;
						var sinceLastSeen = newDeviceState.lastSeen ?
							moment().diff(newDeviceState.lastSeen, 'seconds') :
							null;
						var isStale = (sinceLastSeen >= this.config.keepAlive);
						newDeviceState.online = (sinceLastSeen != null) && (!isStale);
						return newDeviceState;
					}
				});
			}

			this.networkDevices = nextState;

			// Sort list by known device names, then unknown device mac addresses
			if (this.config.sort) {
				this.networkDevices.sort(function(a, b) {
					var stringA, stringB;
					stringA = (a.type != "Unknown" ? "_" + a.name + a.macAddress : a.name);
					stringB = (b.type != "Unknown" ? "_" + b.name + b.macAddress : b.name);

					return stringA.localeCompare(stringB);
				});
			}

			// Send notification if user status has changed
			if (this.config.residents.length > 0) {
				var anyoneHome, command;
				//                self = this;
				anyoneHome = 0;

				this.networkDevices.forEach(function(device) {
					if (self.config.residents.indexOf(device.name) >= 0) {
						anyoneHome = anyoneHome + device.online;
					}
				});

				if (this.config.debug) Log.info("# people home: ", anyoneHome);
				if (this.config.debug) Log.info("Was occupied? ", this.occupied);

				if (anyoneHome > 0) {
					if (this.occupied === false) {
						if (this.config.debug) Log.info("Someone has come home");
						command = self.config.occupiedCMD;
						this.sendNotification(command.notification, command.payload);
						this.occupied = true;
					}
				} else {
					if (this.occupied === true) {
						if (this.config.debug) Log.info("Everyone has left home");
						command = self.config.vacantCMD;
						this.sendNotification(command.notification, command.payload);
						this.occupied = false;
					}
				}
			}

			this.updateDom();
			return;

		}

	},

	// Override dom generator.
	getDom: function() {
		var self = this;

		var wrapper = document.createElement("div");
		wrapper.classList.add("small");

		// Display a loading message
		if (!this.networkDevices) {
			wrapper.innerHTML = this.translate("LOADING");
			return wrapper;
		}

		// Display device status
		var deviceTable = document.createElement("table");
		deviceTable.classList.add("small");
		this.networkDevices.forEach(function(device) {
			if (device && (device.online || device.showOffline)) {

				// device row

				var deviceRow = document.createElement("tr");
				var deviceOnline = (device.online ? "bright" : "dimmed");
				deviceRow.classList.add(deviceOnline);

				// Icon

				var deviceCell = document.createElement("td");
				deviceCell.classList.add("device");
				var icon = document.createElement("i");
				icon.classList.add("fa", "fa-fw", "fa-" + device.icon);

				if (self.config.colored) {
					icon.style.cssText = "color: " + device.color;
				}

				if (self.config.colored && !self.config.coloredSymbolOnly && device.lastSeen) {
					deviceCell.style.cssText = "color: " + device.color;
				}

				deviceCell.appendChild(icon);
				deviceCell.innerHTML += device.name;

				deviceRow.appendChild(deviceCell);

				// When last seen
				if ((self.config.showLastSeen && device.lastSeen  && !self.config.showLastSeenWhenOffline) || 
					(self.config.showLastSeen && !device.lastSeen &&  self.config.showLastSeenWhenOffline)) {
					var dateCell = document.createElement("td");
					dateCell.classList.add("date", "dimmed", "light");
					if (typeof device.lastSeen !== 'undefined') {
						dateCell.innerHTML = device.lastSeen.fromNow();
					}
					deviceRow.appendChild(dateCell);
				}

				deviceTable.appendChild(deviceRow);

			} else {
				if (this.config.debug) Log.info(self.name + " Online, but ignoring: '" + device + "'");
			}
		});
		if (deviceTable.hasChildNodes()) {
			wrapper.appendChild(deviceTable);
		} else {
			// Display no devices online message
			wrapper.innerHTML = this.translate("NO DEVICES ONLINE");
		}

		return wrapper;
	},

	validateDevices: function() {
		this.config.devices.forEach(function(device) {
			// Add missing device attributes.
			if (!device.hasOwnProperty("icon")) {
				device.icon = "question";
			}
			if (!device.hasOwnProperty("color")) {
				device.color = "#ffffff";
			}
			if (!device.hasOwnProperty("showOffline")) {
				device.showOffline = true;
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
		});
	},

	scanNetwork: function() {
		if (this.config.debug) Log.info(this.name + " is initiating network scan");
		var self = this;
		this.sendSocketNotification('SCAN_NETWORK');
		setInterval(function() {
			self.sendSocketNotification('SCAN_NETWORK');
		}, this.config.updateInterval * 1000);
		return;
	},

	updateDeviceStatus: function(device, online) {
		if (device) {
			if (this.config.debug) Log.info(this.name + " is updating device status.", [device.name, online]);
			// Last Seen
			if (online) {
				device.lastSeen = moment();
			}
			// Keep alive?
			var sinceLastSeen = device.lastSeen ?
				moment().diff(device.lastSeen, 'seconds') :
				null;
			var isStale = (sinceLastSeen >= this.config.keepAlive);
			device.online = (sinceLastSeen != null) && (!isStale);
			if (this.config.debug) Log.info(this.name + " " + device.name + " is " + (online ? "online" : "offline"));
		}
		return;
	}

});
