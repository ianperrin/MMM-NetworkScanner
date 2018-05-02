# MMM-NetworkScanner
A module for MagicMirror which determines the status of devices on the network based on their MAC address. It can also look up devices by IP addresses or hostnames. Static IP addresses work more consistently.

## Example

![](.github/example.png)

## Installation

In your terminal, install `arp-scan`:
````
cd ~/
sudo apt-get install arp-scan   
````

In your terminal, go to your MagicMirror's Module folder:
````
cd ~/MagicMirror/modules
````

Clone this repository:
````
git clone https://github.com/ianperrin/MMM-NetworkScanner.git
````

Go to the modules folder:
````
cd MMM-NetworkScanner
````

Install the dependencies (`sudo`, `ping`):
````
npm install
````

Add the module to the modules array in the `config/config.js` file:
````javascript
    {
        module: 'MMM-NetworkScanner',
        position: 'top_left', 
        config: {
            // Optional config options
        }        
    },
````

## Config Options
| **Option** | **Default** | **Description** |
| --- | --- | --- |
| `devices` | [] | an array of devices to be found on the network. See [Device object](#device-object) |
| `network` | "-l" | `optional` a Local Network IP mask to limit the mac address scan, i.e. `192.168.0.0/24`. If not specified the entire localnet will be scanned. |
| `showUnknown` | true | `optional` shows devices found on the network even if not specified in the `devices` option |
| `showOffline` | true | `optional` shows devices specified in the `devices` option even when offline |
| `showLastSeen` | false | `optional` shows when the device was last seen e.g. "Device Name - last seen 5 minutes ago" |
| `keepAlive` | 180 | `optional` how long (in seconds) a device should be considered 'alive' since it was last found on the network |
| `updateInterval` | 20 | `optional` how often (in seconds) the module should scan the network |
| `sort` | `true` | `optional` sorts the devices in alphabetical order when shown in the mirror |
| `residents` | [] | `optional` an array of names of the devices that should be monitored if they are online |
| `occupiedCMD` | `{}` | `optional` Notification to be sent when a resident returnes home e.g. `{notification: 'REMOTE_ACTION', payload: {action: 'MONITORON'}}` would turn the mirror on when a resedent returnes home. |
| `vacantCMD` | `{}` | `optional` Notification to be sent when all residents have left home. |
| `debug` | `false` | `optional` adds extended messages to the log. |

#### Device Object
The device object contains information about the devices to be found on the network.

| **Key** | **Description** | **Example** |
| --- | --- | --- |
| `macAddress` | `optional` the MAC address of the device. | `aa:bb:cc:11:22:33` |
| `ipAddress` | `optional` the IP address **or** host name of the device. | `192.168.0.1` or `github.com` |
| `name` | `optional` the friendly name for the device. If omitted, the `macAddress` or `ipAddress` will be used. | `Phone` or `Router` |
| `icon` | `optional` the symbol to show next to the device. See [Font Awesome](http://fontawesome.io/icons/) website. If omitted, `question` will be used. | There are a huge number of icons to choose from. Here are some examples: `globe`, `server`, `desktop`, `laptop`, `mobile`, `wifi`. |

**Note** A device object should only contain either a `macAddress` *or* an `ipAddress` **NOT** both.

### Example Config
Scan every 5 seconds and only display the specified devices whether they are online or offline. Devices will be considered online for 5 mins after they are last seen:
````javascript
    {
        module: 'MMM-NetworkScanner',
        position: 'top_left', 
        config: {
            devices: [
                    { ipAddress: "github.com", name: "Github", icon: "globe"},
                    { macAddress: "1a:1b:1c:1a:1b:1c", name: "Server", icon: "server"},
                    { macAddress: "2a:2b:2c:2a:2b:2c", name: "Desktop", icon: "desktop"},
                    { ipAddress: "10.1.1.10", name: "Laptop", icon: "laptop"},
                    { macAddress: "4a:4b:4c:4a:4b:4c", name: "Mobile", icon: "mobile"},
                ],
            showUnknown: false,
            showOffline: true,
            keepAlive: 300,
            updateInterval: 5,
            residents: "Mobile",
            occupiedCMD: {notification: 'REMOTE_ACTION', payload: {action: 'MONITORON'}},
            vacantCMD  : {notification: 'REMOTE_ACTION', payload: {action: 'MONITOROFF'}},

        }        
    },
````
(Note that the 'MONITORON'/'MONITOROFF' actions require the MMM-Remote-Control module to be installed)

## Updating

To update the module to the latest version, use your terminal to go to your MMM-NetworkScanner module folder and type the following command:

````
cd ~/MagicMirror/modules/MMM-NetworkScanner
git pull
npm install
```` 

If you haven't changed the modules, this should work without any problems. 
Type `git status` to see your changes, if there are any, you can reset them with `git reset --hard`. After that, git pull should be possible.
