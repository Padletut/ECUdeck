import { ResponsiveContainer, Surface, ZAxis, XAxis, YAxis, Tooltip, Scatter } from 'recharts';

import type { EcuMap } from '../../../shared/types/ecu';

interface Map3DViewProps {
  map: EcuMap | null;
}

export default function Map3DView({ map }: Map3DViewProps) {
  if (!map || !map.xAxis || !map.yAxis || !map.values) {
    return (
      <div className="h-[400px] bg-carbon-black text-soft-white rounded-xl flex items-center justify-center">
        <p>No 3D map data available</p>
      </div>
    );
  }

  const data = [];
  for (let y = 0; y < map.yAxis.length; y++) {
    for (let x = 0; x < map.xAxis.length; x++) {
      data.push({
        x: map.xAxis[x],
        y: map.yAxis[y],
        z: map.values[y][x],
      });
    }
  }

  return (
    <div className="h-[400px] bg-carbon-black text-soft-white rounded-xl">
      <ResponsiveContainer width="100%" height="100%">
        <Surface width={600} height={400}>
          <XAxis type="number" dataKey="x" name="X" unit="" />
          <YAxis type="number" dataKey="y" name="Y" unit="" />
          <ZAxis type="number" dataKey="z" name="Z" range={[0, 100]} unit="" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill="#00B8F1" line shape="circle" />
        </Surface>
      </ResponsiveContainer>
    </div>
  );
}
