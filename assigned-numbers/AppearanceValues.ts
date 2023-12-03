export function getAppearanceCategoryName(category: number): string | null {
  return AppearanceValues.appearance_values.find((c) => c.category === category)?.name ?? null;
}
export function getAppearanceSubcategoryName(category: number, subcategory: number): string | null {
  if (subcategory === 0) {
    return getAppearanceCategoryName(category);
  }
  return AppearanceValues.appearance_values.find((c) => c.category === category)
    ?.subcategory
    ?.find((s) => s.value === subcategory)
    ?.name
    ?? null;
}
export const AppearanceValues: {
  revision: string;
  appearance_values: {
    category: number;
    name: string;
    subcategory?: { value: number; name: string; }[];
  }[];
} = {
  "revision": "2023-12-03",
  "appearance_values": [
    {
      "category": 0,
      "name": "Unknown"
    },
    {
      "category": 1,
      "name": "Phone"
    },
    {
      "category": 2,
      "name": "Computer",
      "subcategory": [
        {
          "value": 1,
          "name": "Desktop Workstation"
        },
        {
          "value": 2,
          "name": "Server-class Computer"
        },
        {
          "value": 3,
          "name": "Laptop"
        },
        {
          "value": 4,
          "name": "Handheld PC/PDA (clamshell)"
        },
        {
          "value": 5,
          "name": "Palm-size PC/PDA"
        },
        {
          "value": 6,
          "name": "Wearable computer (watch size)"
        },
        {
          "value": 7,
          "name": "Tablet"
        },
        {
          "value": 8,
          "name": "Docking Station"
        },
        {
          "value": 9,
          "name": "All in One"
        },
        {
          "value": 10,
          "name": "Blade Server"
        },
        {
          "value": 11,
          "name": "Convertible"
        },
        {
          "value": 12,
          "name": "Detachable"
        },
        {
          "value": 13,
          "name": "IoT Gateway"
        },
        {
          "value": 14,
          "name": "Mini PC"
        },
        {
          "value": 15,
          "name": "Stick PC"
        }
      ]
    },
    {
      "category": 3,
      "name": "Watch",
      "subcategory": [
        {
          "value": 1,
          "name": "Sports Watch"
        },
        {
          "value": 2,
          "name": "Smartwatch"
        }
      ]
    },
    {
      "category": 4,
      "name": "Clock"
    },
    {
      "category": 5,
      "name": "Display"
    },
    {
      "category": 6,
      "name": "Remote Control"
    },
    {
      "category": 7,
      "name": "Eye-glasses"
    },
    {
      "category": 8,
      "name": "Tag"
    },
    {
      "category": 9,
      "name": "Keyring"
    },
    {
      "category": 10,
      "name": "Media Player"
    },
    {
      "category": 11,
      "name": "Barcode Scanner"
    },
    {
      "category": 12,
      "name": "Thermometer",
      "subcategory": [
        {
          "value": 1,
          "name": "Ear Thermometer"
        }
      ]
    },
    {
      "category": 13,
      "name": "Heart Rate Sensor",
      "subcategory": [
        {
          "value": 1,
          "name": "Heart Rate Belt"
        }
      ]
    },
    {
      "category": 14,
      "name": "Blood Pressure",
      "subcategory": [
        {
          "value": 1,
          "name": "Arm Blood Pressure"
        },
        {
          "value": 2,
          "name": "Wrist Blood Pressure"
        }
      ]
    },
    {
      "category": 15,
      "name": "Human Interface Device",
      "subcategory": [
        {
          "value": 1,
          "name": "Keyboard"
        },
        {
          "value": 2,
          "name": "Mouse"
        },
        {
          "value": 3,
          "name": "Joystick"
        },
        {
          "value": 4,
          "name": "Gamepad"
        },
        {
          "value": 5,
          "name": "Digitizer Tablet"
        },
        {
          "value": 6,
          "name": "Card Reader"
        },
        {
          "value": 7,
          "name": "Digital Pen"
        },
        {
          "value": 8,
          "name": "Barcode Scanner"
        },
        {
          "value": 9,
          "name": "Touchpad"
        },
        {
          "value": 10,
          "name": "Presentation Remote"
        }
      ]
    },
    {
      "category": 16,
      "name": "Glucose Meter"
    },
    {
      "category": 17,
      "name": "Running Walking Sensor",
      "subcategory": [
        {
          "value": 1,
          "name": "In-Shoe Running Walking Sensor"
        },
        {
          "value": 2,
          "name": "On-Shoe Running Walking Sensor"
        },
        {
          "value": 3,
          "name": "On-Hip Running Walking Sensor"
        }
      ]
    },
    {
      "category": 18,
      "name": "Cycling",
      "subcategory": [
        {
          "value": 1,
          "name": "Cycling Computer"
        },
        {
          "value": 2,
          "name": "Speed Sensor"
        },
        {
          "value": 3,
          "name": "Cadence Sensor"
        },
        {
          "value": 4,
          "name": "Power Sensor"
        },
        {
          "value": 5,
          "name": "Speed and Cadence Sensor"
        }
      ]
    },
    {
      "category": 19,
      "name": "Control Device",
      "subcategory": [
        {
          "value": 1,
          "name": "Switch"
        },
        {
          "value": 2,
          "name": "Multi-switch"
        },
        {
          "value": 3,
          "name": "Button"
        },
        {
          "value": 4,
          "name": "Slider"
        },
        {
          "value": 5,
          "name": "Rotary Switch"
        },
        {
          "value": 6,
          "name": "Touch Panel"
        },
        {
          "value": 7,
          "name": "Single Switch"
        },
        {
          "value": 8,
          "name": "Double Switch"
        },
        {
          "value": 9,
          "name": "Triple Switch"
        },
        {
          "value": 10,
          "name": "Battery Switch"
        },
        {
          "value": 11,
          "name": "Energy Harvesting Switch"
        },
        {
          "value": 12,
          "name": "Push Button"
        },
        {
          "value": 13,
          "name": "Dial"
        }
      ]
    },
    {
      "category": 20,
      "name": "Network Device",
      "subcategory": [
        {
          "value": 1,
          "name": "Access Point"
        },
        {
          "value": 2,
          "name": "Mesh Device"
        },
        {
          "value": 3,
          "name": "Mesh Network Proxy"
        }
      ]
    },
    {
      "category": 21,
      "name": "Sensor",
      "subcategory": [
        {
          "value": 1,
          "name": "Motion Sensor"
        },
        {
          "value": 2,
          "name": "Air quality Sensor"
        },
        {
          "value": 3,
          "name": "Temperature Sensor"
        },
        {
          "value": 4,
          "name": "Humidity Sensor"
        },
        {
          "value": 5,
          "name": "Leak Sensor"
        },
        {
          "value": 6,
          "name": "Smoke Sensor"
        },
        {
          "value": 7,
          "name": "Occupancy Sensor"
        },
        {
          "value": 8,
          "name": "Contact Sensor"
        },
        {
          "value": 9,
          "name": "Carbon Monoxide Sensor"
        },
        {
          "value": 10,
          "name": "Carbon Dioxide Sensor"
        },
        {
          "value": 11,
          "name": "Ambient Light Sensor"
        },
        {
          "value": 12,
          "name": "Energy Sensor"
        },
        {
          "value": 13,
          "name": "Color Light Sensor"
        },
        {
          "value": 14,
          "name": "Rain Sensor"
        },
        {
          "value": 15,
          "name": "Fire Sensor"
        },
        {
          "value": 16,
          "name": "Wind Sensor"
        },
        {
          "value": 17,
          "name": "Proximity Sensor"
        },
        {
          "value": 18,
          "name": "Multi-Sensor"
        },
        {
          "value": 19,
          "name": "Flush Mounted Sensor"
        },
        {
          "value": 20,
          "name": "Ceiling Mounted Sensor"
        },
        {
          "value": 21,
          "name": "Wall Mounted Sensor"
        },
        {
          "value": 22,
          "name": "Multisensor"
        },
        {
          "value": 23,
          "name": "Energy Meter"
        },
        {
          "value": 24,
          "name": "Flame Detector"
        },
        {
          "value": 25,
          "name": "Vehicle Tire Pressure Sensor"
        }
      ]
    },
    {
      "category": 22,
      "name": "Light Fixtures",
      "subcategory": [
        {
          "value": 1,
          "name": "Wall Light"
        },
        {
          "value": 2,
          "name": "Ceiling Light"
        },
        {
          "value": 3,
          "name": "Floor Light"
        },
        {
          "value": 4,
          "name": "Cabinet Light"
        },
        {
          "value": 5,
          "name": "Desk Light"
        },
        {
          "value": 6,
          "name": "Troffer Light"
        },
        {
          "value": 7,
          "name": "Pendant Light"
        },
        {
          "value": 8,
          "name": "In-ground Light"
        },
        {
          "value": 9,
          "name": "Flood Light"
        },
        {
          "value": 10,
          "name": "Underwater Light"
        },
        {
          "value": 11,
          "name": "Bollard with Light"
        },
        {
          "value": 12,
          "name": "Pathway Light"
        },
        {
          "value": 13,
          "name": "Garden Light"
        },
        {
          "value": 14,
          "name": "Pole-top Light"
        },
        {
          "value": 15,
          "name": "Spotlight"
        },
        {
          "value": 16,
          "name": "Linear Light"
        },
        {
          "value": 17,
          "name": "Street Light"
        },
        {
          "value": 18,
          "name": "Shelves Light"
        },
        {
          "value": 19,
          "name": "Bay Light"
        },
        {
          "value": 20,
          "name": "Emergency Exit Light"
        },
        {
          "value": 21,
          "name": "Light Controller"
        },
        {
          "value": 22,
          "name": "Light Driver"
        },
        {
          "value": 23,
          "name": "Bulb"
        },
        {
          "value": 24,
          "name": "Low-bay Light"
        },
        {
          "value": 25,
          "name": "High-bay Light"
        }
      ]
    },
    {
      "category": 23,
      "name": "Fan",
      "subcategory": [
        {
          "value": 1,
          "name": "Ceiling Fan"
        },
        {
          "value": 2,
          "name": "Axial Fan"
        },
        {
          "value": 3,
          "name": "Exhaust Fan"
        },
        {
          "value": 4,
          "name": "Pedestal Fan"
        },
        {
          "value": 5,
          "name": "Desk Fan"
        },
        {
          "value": 6,
          "name": "Wall Fan"
        }
      ]
    },
    {
      "category": 24,
      "name": "HVAC",
      "subcategory": [
        {
          "value": 1,
          "name": "Thermostat"
        },
        {
          "value": 2,
          "name": "Humidifier"
        },
        {
          "value": 3,
          "name": "De-humidifier"
        },
        {
          "value": 4,
          "name": "Heater"
        },
        {
          "value": 5,
          "name": "Radiator"
        },
        {
          "value": 6,
          "name": "Boiler"
        },
        {
          "value": 7,
          "name": "Heat Pump"
        },
        {
          "value": 8,
          "name": "Infrared Heater"
        },
        {
          "value": 9,
          "name": "Radiant Panel Heater"
        },
        {
          "value": 10,
          "name": "Fan Heater"
        },
        {
          "value": 11,
          "name": "Air Curtain"
        }
      ]
    },
    {
      "category": 25,
      "name": "Air Conditioning"
    },
    {
      "category": 26,
      "name": "Humidifier"
    },
    {
      "category": 27,
      "name": "Heating",
      "subcategory": [
        {
          "value": 1,
          "name": "Radiator"
        },
        {
          "value": 2,
          "name": "Boiler"
        },
        {
          "value": 3,
          "name": "Heat Pump"
        },
        {
          "value": 4,
          "name": "Infrared Heater"
        },
        {
          "value": 5,
          "name": "Radiant Panel Heater"
        },
        {
          "value": 6,
          "name": "Fan Heater"
        },
        {
          "value": 7,
          "name": "Air Curtain"
        }
      ]
    },
    {
      "category": 28,
      "name": "Access Control",
      "subcategory": [
        {
          "value": 1,
          "name": "Access Door"
        },
        {
          "value": 2,
          "name": "Garage Door"
        },
        {
          "value": 3,
          "name": "Emergency Exit Door"
        },
        {
          "value": 4,
          "name": "Access Lock"
        },
        {
          "value": 5,
          "name": "Elevator"
        },
        {
          "value": 6,
          "name": "Window"
        },
        {
          "value": 7,
          "name": "Entrance Gate"
        },
        {
          "value": 8,
          "name": "Door Lock"
        },
        {
          "value": 9,
          "name": "Locker"
        }
      ]
    },
    {
      "category": 29,
      "name": "Motorized Device",
      "subcategory": [
        {
          "value": 1,
          "name": "Motorized Gate"
        },
        {
          "value": 2,
          "name": "Awning"
        },
        {
          "value": 3,
          "name": "Blinds or Shades"
        },
        {
          "value": 4,
          "name": "Curtains"
        },
        {
          "value": 5,
          "name": "Screen"
        }
      ]
    },
    {
      "category": 30,
      "name": "Power Device",
      "subcategory": [
        {
          "value": 1,
          "name": "Power Outlet"
        },
        {
          "value": 2,
          "name": "Power Strip"
        },
        {
          "value": 3,
          "name": "Plug"
        },
        {
          "value": 4,
          "name": "Power Supply"
        },
        {
          "value": 5,
          "name": "LED Driver"
        },
        {
          "value": 6,
          "name": "Fluorescent Lamp Gear"
        },
        {
          "value": 7,
          "name": "HID Lamp Gear"
        },
        {
          "value": 8,
          "name": "Charge Case"
        },
        {
          "value": 9,
          "name": "Power Bank"
        }
      ]
    },
    {
      "category": 31,
      "name": "Light Source",
      "subcategory": [
        {
          "value": 1,
          "name": "Incandescent Light Bulb"
        },
        {
          "value": 2,
          "name": "LED Lamp"
        },
        {
          "value": 3,
          "name": "HID Lamp"
        },
        {
          "value": 4,
          "name": "Fluorescent Lamp"
        },
        {
          "value": 5,
          "name": "LED Array"
        },
        {
          "value": 6,
          "name": "Multi-Color LED Array"
        },
        {
          "value": 7,
          "name": "Low voltage halogen"
        },
        {
          "value": 8,
          "name": "Organic light emitting diode (OLED)"
        }
      ]
    },
    {
      "category": 32,
      "name": "Window Covering",
      "subcategory": [
        {
          "value": 1,
          "name": "Window Shades"
        },
        {
          "value": 2,
          "name": "Window Blinds"
        },
        {
          "value": 3,
          "name": "Window Awning"
        },
        {
          "value": 4,
          "name": "Window Curtain"
        },
        {
          "value": 5,
          "name": "Exterior Shutter"
        },
        {
          "value": 6,
          "name": "Exterior Screen"
        }
      ]
    },
    {
      "category": 33,
      "name": "Audio Sink",
      "subcategory": [
        {
          "value": 1,
          "name": "Standalone Speaker"
        },
        {
          "value": 2,
          "name": "Soundbar"
        },
        {
          "value": 3,
          "name": "Bookshelf Speaker"
        },
        {
          "value": 4,
          "name": "Standmounted Speaker"
        },
        {
          "value": 5,
          "name": "Speakerphone"
        }
      ]
    },
    {
      "category": 34,
      "name": "Audio Source",
      "subcategory": [
        {
          "value": 1,
          "name": "Microphone"
        },
        {
          "value": 2,
          "name": "Alarm"
        },
        {
          "value": 3,
          "name": "Bell"
        },
        {
          "value": 4,
          "name": "Horn"
        },
        {
          "value": 5,
          "name": "Broadcasting Device"
        },
        {
          "value": 6,
          "name": "Service Desk"
        },
        {
          "value": 7,
          "name": "Kiosk"
        },
        {
          "value": 8,
          "name": "Broadcasting Room"
        },
        {
          "value": 9,
          "name": "Auditorium"
        }
      ]
    },
    {
      "category": 35,
      "name": "Motorized Vehicle",
      "subcategory": [
        {
          "value": 1,
          "name": "Car"
        },
        {
          "value": 2,
          "name": "Large Goods Vehicle"
        },
        {
          "value": 3,
          "name": "2-Wheeled Vehicle"
        },
        {
          "value": 4,
          "name": "Motorbike"
        },
        {
          "value": 5,
          "name": "Scooter"
        },
        {
          "value": 6,
          "name": "Moped"
        },
        {
          "value": 7,
          "name": "3-Wheeled Vehicle"
        },
        {
          "value": 8,
          "name": "Light Vehicle"
        },
        {
          "value": 9,
          "name": "Quad Bike"
        },
        {
          "value": 10,
          "name": "Minibus"
        },
        {
          "value": 11,
          "name": "Bus"
        },
        {
          "value": 12,
          "name": "Trolley"
        },
        {
          "value": 13,
          "name": "Agricultural Vehicle"
        },
        {
          "value": 14,
          "name": "Camper / Caravan"
        },
        {
          "value": 15,
          "name": "Recreational Vehicle / Motor Home"
        }
      ]
    },
    {
      "category": 36,
      "name": "Domestic Appliance",
      "subcategory": [
        {
          "value": 1,
          "name": "Refrigerator"
        },
        {
          "value": 2,
          "name": "Freezer"
        },
        {
          "value": 3,
          "name": "Oven"
        },
        {
          "value": 4,
          "name": "Microwave"
        },
        {
          "value": 5,
          "name": "Toaster"
        },
        {
          "value": 6,
          "name": "Washing Machine"
        },
        {
          "value": 7,
          "name": "Dryer"
        },
        {
          "value": 8,
          "name": "Coffee maker"
        },
        {
          "value": 9,
          "name": "Clothes iron"
        },
        {
          "value": 10,
          "name": "Curling iron"
        },
        {
          "value": 11,
          "name": "Hair dryer"
        },
        {
          "value": 12,
          "name": "Vacuum cleaner"
        },
        {
          "value": 13,
          "name": "Robotic vacuum cleaner"
        },
        {
          "value": 14,
          "name": "Rice cooker"
        },
        {
          "value": 15,
          "name": "Clothes steamer"
        }
      ]
    },
    {
      "category": 37,
      "name": "Wearable Audio Device",
      "subcategory": [
        {
          "value": 1,
          "name": "Earbud"
        },
        {
          "value": 2,
          "name": "Headset"
        },
        {
          "value": 3,
          "name": "Headphones"
        },
        {
          "value": 4,
          "name": "Neck Band"
        }
      ]
    },
    {
      "category": 38,
      "name": "Aircraft",
      "subcategory": [
        {
          "value": 1,
          "name": "Light Aircraft"
        },
        {
          "value": 2,
          "name": "Microlight"
        },
        {
          "value": 3,
          "name": "Paraglider"
        },
        {
          "value": 4,
          "name": "Large Passenger Aircraft"
        }
      ]
    },
    {
      "category": 39,
      "name": "AV Equipment",
      "subcategory": [
        {
          "value": 1,
          "name": "Amplifier"
        },
        {
          "value": 2,
          "name": "Receiver"
        },
        {
          "value": 3,
          "name": "Radio"
        },
        {
          "value": 4,
          "name": "Tuner"
        },
        {
          "value": 5,
          "name": "Turntable"
        },
        {
          "value": 6,
          "name": "CD Player"
        },
        {
          "value": 7,
          "name": "DVD Player"
        },
        {
          "value": 8,
          "name": "Bluray Player"
        },
        {
          "value": 9,
          "name": "Optical Disc Player"
        },
        {
          "value": 10,
          "name": "Set-Top Box"
        }
      ]
    },
    {
      "category": 40,
      "name": "Display Equipment",
      "subcategory": [
        {
          "value": 1,
          "name": "Television"
        },
        {
          "value": 2,
          "name": "Monitor"
        },
        {
          "value": 3,
          "name": "Projector"
        }
      ]
    },
    {
      "category": 41,
      "name": "Hearing aid",
      "subcategory": [
        {
          "value": 1,
          "name": "In-ear hearing aid"
        },
        {
          "value": 2,
          "name": "Behind-ear hearing aid"
        },
        {
          "value": 3,
          "name": "Cochlear Implant"
        }
      ]
    },
    {
      "category": 42,
      "name": "Gaming",
      "subcategory": [
        {
          "value": 1,
          "name": "Home Video Game Console"
        },
        {
          "value": 2,
          "name": "Portable handheld console"
        }
      ]
    },
    {
      "category": 43,
      "name": "Signage",
      "subcategory": [
        {
          "value": 1,
          "name": "Digital Signage"
        },
        {
          "value": 2,
          "name": "Electronic Label"
        }
      ]
    },
    {
      "category": 49,
      "name": "Pulse Oximeter",
      "subcategory": [
        {
          "value": 1,
          "name": "Fingertip Pulse Oximeter"
        },
        {
          "value": 2,
          "name": "Wrist Worn Pulse Oximeter"
        }
      ]
    },
    {
      "category": 50,
      "name": "Weight Scale"
    },
    {
      "category": 51,
      "name": "Personal Mobility Device",
      "subcategory": [
        {
          "value": 1,
          "name": "Powered Wheelchair"
        },
        {
          "value": 2,
          "name": "Mobility Scooter"
        }
      ]
    },
    {
      "category": 52,
      "name": "Continuous Glucose Monitor"
    },
    {
      "category": 53,
      "name": "Insulin Pump",
      "subcategory": [
        {
          "value": 1,
          "name": "Insulin Pump, durable pump"
        },
        {
          "value": 4,
          "name": "Insulin Pump, patch pump"
        },
        {
          "value": 8,
          "name": "Insulin Pen"
        }
      ]
    },
    {
      "category": 54,
      "name": "Medication Delivery"
    },
    {
      "category": 55,
      "name": "Spirometer",
      "subcategory": [
        {
          "value": 1,
          "name": "Handheld Spirometer"
        }
      ]
    },
    {
      "category": 81,
      "name": "Outdoor Sports Activity",
      "subcategory": [
        {
          "value": 1,
          "name": "Location Display"
        },
        {
          "value": 2,
          "name": "Location and Navigation Display"
        },
        {
          "value": 3,
          "name": "Location Pod"
        },
        {
          "value": 4,
          "name": "Location and Navigation Pod"
        }
      ]
    }
  ]
}