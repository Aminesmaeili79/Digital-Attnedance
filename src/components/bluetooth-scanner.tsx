'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Bluetooth, AlertTriangle, Smartphone } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
  const [isBluetoothSupported, setIsBluetoothSupported] = useState(true);
  const [useDemoMode, setUseDemoMode] = useState(false);
  const [secureContext, setSecureContext] = useState(true);

  useEffect(() => {
    // Check if we're in a secure context (HTTPS or localhost)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setSecureContext(false);
      setError('Web Bluetooth API requires a secure context (HTTPS)');
    }

    // Check if Web Bluetooth API is supported
    const checkBluetooth = async () => {
      try {
        // Basic check first
        if (!navigator.bluetooth) {
          throw new Error('Web Bluetooth API is not supported in your browser');
        }

        // Some browsers support bluetooth but not getAvailability
        if (navigator.bluetooth.getAvailability) {
          const available = await navigator.bluetooth.getAvailability();
          if (!available) {
            throw new Error('Bluetooth is not available on this device');
          }
        }

        setIsBluetoothSupported(true);
      } catch (err) {
        console.warn('Bluetooth not available:', err);
        setIsBluetoothSupported(false);
        setError(`${err instanceof Error ? err.message : 'Bluetooth not available'}`);
        setUseDemoMode(true); // Auto-enable demo mode when Bluetooth is not available
      }
    };

    checkBluetooth();
  }, []);

  // Generate random demo devices
  const generateDemoDevices = () => {
    const demoDevices = [
      { id: 'st101', name: 'st101' },
      { id: 'st102', name: 'st102' },
      { id: 'st103', name: 'st103' },
    ];
    setDevices(demoDevices);
    if (!selectedDeviceId) {
      onDeviceSelected(demoDevices[0].id);
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

    if (!navigator.bluetooth) {
      setError('Web Bluetooth API is not supported in your browser.');
      setIsScanning(false);
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [] // You can specify services if needed
      });

      // Add the discovered device to our list
      setDevices(prevDevices => [
        ...prevDevices,
        { 
          id: device.id,
          name: device.name || `Unknown Device (${device.id.slice(0, 8)})` 
        }
      ]);

      // Automatically select this device if we don't have one selected yet
      if (!selectedDeviceId) {
        onDeviceSelected(device.id);
      }
    } catch (err) {
      console.error('Bluetooth scanning error:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for Bluetooth devices');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Bluetooth Devices</h3>
          <div className="flex items-center space-x-2">
            {(!isBluetoothSupported || !secureContext) && (
              <div className="flex items-center space-x-2 mr-2">
                <Switch 
                  id="demo-mode" 
                  checked={useDemoMode} 
                  onCheckedChange={setUseDemoMode}
                />
                <Label htmlFor="demo-mode" className="text-xs">Demo Mode</Label>
              </div>
            )}
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
        
        {error && !useDemoMode && (
          <div className="flex items-center text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        {!secureContext && !useDemoMode && (
          <div className="text-amber-500 text-sm">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            Bluetooth API requires HTTPS. Use demo mode or switch to a secure connection.
          </div>
        )}

        {!isBluetoothSupported && !useDemoMode && (
          <div className="text-amber-500 text-sm">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            Bluetooth is not supported in your browser. Please use Chrome or Edge on desktop, or Android with Chrome, or enable Demo Mode.
          </div>
        )}
        
        {useDemoMode && (
          <div className="text-blue-500 text-sm font-medium">
            <Smartphone className="h-4 w-4 inline mr-1" />
            Using simulated Bluetooth devices for demonstration
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