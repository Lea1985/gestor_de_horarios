// features/dashboard/components/CoberturaDonut.tsx
"use client"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

type CoberturaDetalle = {
  normales: number
  reemplazadas: number
  sinCobertura: number
  suspendidas: number
  total: number
}

export function CoberturaDonut({ data }: { data: CoberturaDetalle }) {
  const chartData = [
    { name: "Normales", value: data.normales, color: "#22c55e" },
    { name: "Reemplazadas", value: data.reemplazadas, color: "#3b82f6" },
    { name: "Sin cobertura", value: data.sinCobertura, color: "#ef4444" },
    { name: "Suspendidas", value: data.suspendidas, color: "#f59e0b" },
  ].filter(item => item.value > 0)

  return (
    <div style={{ width: "100%", height: 250 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => {
              const porcentaje = percent !== undefined ? (percent * 100).toFixed(0) : "0"
              return `${name}: ${porcentaje}%`
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}