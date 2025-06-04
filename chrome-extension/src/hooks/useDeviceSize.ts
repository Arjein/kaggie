import { useState, useEffect } from 'react';

type DeviceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

function getDeviceSize(width: number): DeviceSize {
  if (width >= 1280) return "xl";
  if (width >= 1024) return "lg";
  if (width >= 768) return "md";
  if (width >= 640) return "sm";
  return "xs";
}

export function useDeviceSize() {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>(
    getDeviceSize(window.innerWidth)
  );

  useEffect(() => {
    const handleResize = () => setDeviceSize(getDeviceSize(window.innerWidth));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return deviceSize;
}
