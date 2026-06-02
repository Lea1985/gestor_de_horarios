"use client"

type TimelineItem = {

  fecha: string

  total: number

  normales: number

  reemplazadas: number

  sinCobertura: number

  suspendidas: number

  coberturaPorcentaje: number
}

type Props = {

  data: TimelineItem[]
}

export function TimelineCoberturaChart({
  data,
}: Props) {

  const max =
    Math.max(
      ...data.map(d => d.total),
      1
    )

  return (

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >

      <div
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-medium)",
          color: "var(--color-text-primary)",
        }}
      >
        Cobertura institucional
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "6px",
          height: "220px",
          padding: "var(--space-3)",
          border:
            "1px solid var(--color-border)",
          borderRadius:
            "var(--radius-xl)",
          background:
            "var(--color-surface)",
        }}
      >

        {data.map(item => {

          const altura =
            (item.total / max) * 100

          return (

            <div
              key={item.fecha}

              style={{
                flex: 1,

                display: "flex",

                flexDirection: "column",

                justifyContent: "flex-end",

                alignItems: "center",

                gap: "6px",
              }}
            >

              <div
                title={`${item.fecha} - ${item.total} clases`}
                style={{

                  width: "100%",

                  height: `${altura}%`,

                  minHeight: "4px",

                  borderRadius: "6px 6px 0 0",

                  background:
                    "var(--color-primary)",
                }}
              />

              <div
                style={{
                  fontSize:
                    "10px",

                  color:
                    "var(--color-text-secondary)",

                  writingMode:
                    "vertical-rl",

                  transform:
                    "rotate(180deg)",
                }}
              >
                {item.fecha.slice(5)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}