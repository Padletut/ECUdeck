import type { EcuMap } from '../../../shared/types/ecu';

interface Map2DViewProps {
  map: EcuMap | null;
}

export default function Map2DView({ map }: Map2DViewProps) {
  if (!map || !map.xAxis || !map.yAxis || !map.values) {
    return (
      <div className="h-[400px] bg-carbon-black text-soft-white rounded-xl flex items-center justify-center">
        <p>No 2D map data available</p>
      </div>
    );
  }

  const { xAxis, yAxis, values } = map;

  return (
    <div className="overflow-auto text-sm font-mono">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="text-muted-text px-2 py-1">Y \ X</th>
            {xAxis.map((x, i) => (
              <th key={i} className="text-electric-blue px-2 py-1">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.map((row, y) => (
            <tr key={y}>
              <td className="text-dyno-green px-2 py-1 font-bold">{yAxis[y]}</td>
              {row.map((val, x) => (
                <td
                  key={x}
                  className="text-soft-white px-2 py-1 text-center border border-gridlines-grey"
                >
                  {val.toFixed(1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
