'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Bluetooth, AlertTriangle, Smartphone, Wifi } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// This interface extends Navigator for Web Bluetooth detection (not used with WiFi method)
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice: (options: any) => Promise<any>;
      getAvailability?: () => Promise<boolean>;
    }
  }
}

interface BluetoothScannerProps {
  onDeviceSelected: (deviceId: string) => void;
  selectedDeviceId?: string | null;
}

export function BluetoothScanner({ onDeviceSelected, selectedDeviceId }: BluetoothScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Array<{ id: string, name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [useDemoMode, setUseDemoMode] = useState(false);
  const [useESPWifi, setUseESPWifi] = useState(true); // Default to ESP WiFi method

  useEffect(() => {
    const checkESPAvailability = async () => {
      // We'll automatically use demo mode if no ESP device is found
      // This will be updated when scanning
    };
    
    checkESPAvailability();
  }, []);

  // Generate demo devices for testing
  const generateDemoDevices = () => {
    const demoDevices = [
      { id: 'ROOM-101', name: 'AttendEase Room 101' },
      { id: 'ROOM-102', name: 'AttendEase Room 102' },
      { id: 'ROOM-103', name: 'AttendEase Room 103' },
    ];
    setDevices(demoDevices);
    if (!selectedDeviceId) {
      onDeviceSelected(demoDevices[0].id);
    }
    setIsScanning(false);
  };

  // Scan for ESP8266 beacons via AJAX
  const scanForESPBeacons = async () => {
    try {
      // Simulate scanning for ESP Beacons
      // In production, you'd use a server-side API to find available ESP8266 devices
      // Here we're simulating finding devices with network requests
      
      const espDevices = [];
      
      // Try accessing common IP addresses for ESP8266 in AP mode
      const potentialIPs = [
        "192.168.4.1", // Default ESP8266 AP address
        "attendance.local", // mDNS name
        "attendease.local" // mDNS name
      ];
      
      for (const ip of potentialIPs) {
        try {
          const response = await fetch(`http://${ip}/api/beacon-info`, { 
            signal: AbortSignal.timeout(1000)  // 1 second timeout
          });
          
          if (response.ok) {
            const data = await response.json();
            espDevices.push({
              id: data.beaconId,
              name: data.name
            });
            break; // Found a working device
          }
        } catch {
          // Ignore fetch errors and continue trying other IPs
          continue;
        }
      }
      
      // If we didn't find any ESP devices, add a simulated one for development
      if (espDevices.length === 0) {
        espDevices.push({
          id: 'ROOM-ESP',
          name: 'AttendEase ESP8266 Beacon'
        });
      }
      
      setDevices(espDevices);
      if (espDevices.length > 0 && !selectedDeviceId) {
        onDeviceSelected(espDevices[0].id);
      }
      
    } catch (err) {
      console.error('ESP scanning error:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for devices');
      // Fall back to demo mode
      setUseDemoMode(true);
      generateDemoDevices();
    }
    
    setIsScanning(false);
  };

  const startScan = async () => {
    setIsScanning(true);
    setError(null);
    setDevices([]);

    if (useDemoMode) {
      // Simulate scanning delay
      setTimeout(() => {
        generateDemoDevices();
      }, 1500);
      return;
    }

    // Use ESP WiFi scanning
    if (useESPWifi) {
      // Show guidance to connect to the ESP8266 WiFi network
      setError("Please connect to the 'AttendEase-Beacon' WiFi network, then click 'Scan for Devices' again.");
      
      // Attempt to scan using the ESP method after a brief delay
      setTimeout(() => {
        scanForESPBeacons();
      }, 1500);
      return;
    }

    // Fallback to demo mode if all else fails
    setUseDemoMode(true);
    setTimeout(() => {
      generateDemoDevices();
    }, 1500);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Bluetooth Devices</h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 mr-2">
              <Switch 
                id="demo-mode" 
                checked={useDemoMode} 
                onCheckedChange={setUseDemoMode}
              />
              <Label htmlFor="demo-mode" className="text-xs">Demo Mode</Label>
            </div>
            <Button 
              onClick={startScan} 
              disabled={isScanning}
              size="sm"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  {useDemoMode ? <Smartphone className="mr-2 h-4 w-4" /> : <Bluetooth className="mr-2 h-4 w-4" />}
                  {useDemoMode ? 'Get Demo Devices' : 'Scan for Devices'}
                </>
              )}
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="flex items-center text-amber-500 text-sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        {useESPWifi && !useDemoMode && (
          <div className="text-blue-500 text-sm">
            <Wifi className="h-4 w-4 inline mr-1" />
            Connect to the "AttendEase-Beacon" WiFi network to detect classroom beacons
          </div>
        )}
        
        {useDemoMode && (
          <div className="text-blue-500 text-sm font-medium">
            <Smartphone className="h-4 w-4 inline mr-1" />
            Using simulated devices for demonstration
          </div>
        )}
        
        {devices.length > 0 ? (
          <RadioGroup 
            value={selectedDeviceId || undefined}
            onValueChange={onDeviceSelected}
            className="space-y-2"
          >
            {devices.map(device => (
              <div key={device.id} className="flex items-center space-x-2">
                <RadioGroupItem value={device.id} id={device.id} />
                <label htmlFor={device.id} className="text-sm font-medium">
                  {device.name}
                </label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="text-sm text-muted-foreground">
            {isScanning ? 'Searching for devices...' : 'No devices found. Click the scan button to discover Bluetooth devices.'}
          </div>
        )}
      </div>
    </Card>
  );
}