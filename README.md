<p align="center">
  <a href="https://github.com/homebridge/homebridge"><img src="https://raw.githubusercontent.com/homebridge/branding/master/logos/homebridge-color-round-stylized.png" height="140"></a>
</p>

<span align="center">

# homebridge-solis5g-battery

[![npm](https://img.shields.io/npm/v/homebridge-solis5g-battery.svg)](https://www.npmjs.com/package/homebridge-solis5g-battery) [![npm](https://img.shields.io/npm/dt/homebridge-solis5g-battery.svg)](https://www.npmjs.com/package/homebridge-solis5g-battery)

</span>

## Description

This [homebridge](https://github.com/homebridge/homebridge) plugin read Battery configuration from your cloud Solis 5G account and exposes it as a Fan Accessory to Apple's [HomeKit](http://www.apple.com/ios/home/). 
Battery % is displayed as rotationSpeed of the Fan.

## Installation

1. Install [homebridge](https://github.com/homebridge/homebridge#installation)
2. Install this plugin: `npm install -g homebridge-solis5g-battery`
3. Obtain from Solis Support your personal KeyID and Secret
4. To find your StationId, navigate via Browser to your main `https://www.soliscloud.com` page, open your main Station details, station Id will be in url `https://www.soliscloud.com/#/station/stationdetail_1?id=<Your StationId>`
4. Update your `config.json` file

## Configuration

```json
"accessories": [
     {
       "accessory": "Solis5gBattery",
       "name": "Battery",  
       "solis_keyid": "<Solis KeyId>",
       "solis_secret": "<Solis Secret>",       
       "solis_stationId": "<Solis StationId>"     
     }
]
```

### Core
| Key | Description | Default |
| --- | --- | --- |
| `accessory` | Must be `Solis5gBattery` | N/A |
| `name` | Name to appear in the Home app | N/A |
| `solis_keyid` | Solis KeyId (obtain from Solis support) | N/A |
| `solis_secret` | Solis Secret (obtain from Solis support) | N/A |
| `solis_stationId` | Solis StationId (Your main StationId) | N/A |

### Optional fields
| Key | Description | Default |
| --- | --- | --- |
| `solis_url` | Main Solis URL where requests are send | `https://www.soliscloud.com:13333` |
| `lowBatteryTreshold` | If Battery level drop below definded treshold (0-100), notify Apple UI about it | N/A |
| `powerPW` | Set to true to get current generation power from your Solar Panels (Watt)  | N/A |





### Additional options
| Key | Description | Default |
| --- | --- | --- |
| `pollInterval` | Time (in seconds) between device polls | `300` |
| `model` | Appears under the _Model_ field for the accessory | plugin |
| `serial` | Appears under the _Serial_ field for the accessory | `000-000-000-001` |
| `manufacturer` | Appears under the _Manufacturer_ field for the accessory | author |
| `firmware` | Appears under the _Firmware_ field for the accessory | version |


