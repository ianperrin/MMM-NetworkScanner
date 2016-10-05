/* global require, module */
/* Magic Mirror
 * Node Helper: MMM-NetworkScanner
 *
 * By Ian Perrin http://ianperrin.com
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var sudo = require("sudo");


module.exports = NodeHelper.create({
    start: function function_name () {
        console.log("Starting module: " + this.name);
    },

    // Override socketNotificationReceived method.
    socketNotificationReceived: function(notification, payload) {
        console.log(this.name + ' received ' + notification);

        if (notification === "SCAN_NETWORK") {
            this.config = payload;
            this.scanNetwork();
            return true;
        }
    },

    scanNetwork: function() {
        console.log(this.name + " is scanning for mac addresses");

        var self = this;
        var arp = sudo(['arp-scan', '-l', '-q']);
        var buffer = '';
        var errstream = '';

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
                console.log(self.name + " received an error running arp-scan: " + code + " - " + errstream);
                return;
            }
            //Parse the response
            var rows = buffer.split('\n');
            var macAddresses = [];

            // ARP-SCAN table
            for (var i = 2; i < rows.length; i++) {
                var cells = rows[i].split('\t').filter(String);
                if (cells[1] && macAddresses.indexOf(cells[1].toUpperCase()) === -1) {
                    macAddresses.push(cells[1].toUpperCase());
                }
            }

            self.sendSocketNotification('MAC_ADDRESSES', macAddresses);
        });

    }
});