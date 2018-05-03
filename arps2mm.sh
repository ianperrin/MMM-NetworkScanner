#!/usr/bin/env bash
# arps2mm.sh -- A script to convert arp-scan output into MMM-NetworkScanner config file device items

DARP=$(sudo arp-scan -N -l |tail -n +3 |head -n -3 |sort)
DDEV=""

#echo -e "DEVICE LIST:\n${DARP}\n\n"

echo "devices: ["
echo -e -n "$DARP\n" | while read line; do
    DMAC=$(echo $line | awk -F " " '{print $2}');
    DNAME=$(echo $line | awk -F " " '{print $3}' | cut -d ' ' -f1 );
    DIP=$(echo $line | awk -F " " '{print $1}');
    DDEV="    { macAddress: \"$DMAC\", name: \"${DNAME}\", icon: \"mobile\" },    // ${DIP}\\n";
    echo -e -n "$DDEV"
done
echo -e "],\n"

exit 0
