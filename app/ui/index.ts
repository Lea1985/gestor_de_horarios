/* ============================================================
   ALNEXT — UI exports centralizados
   
   Importar siempre desde "@/app/ui", nunca por path directo.
   
   ✅  import { Button, Card } from "@/app/ui"
   ❌  import { Button } from "@/app/ui/components/Button"
   ============================================================ */

/* ── Componentes base ───────────────────────────────────── */
/*export { Button }        from "./components/Button"
export { Card }          from "./components/Card"
export { Input }         from "./components/Input"
export { Table }         from "./components/Table"*/
export { LogoutButton }  from "./components/LogoutButton"

/* ── Layout ─────────────────────────────────────────────── */
export { DashboardLayout } from "./components/layout/DashboardLayout"
export { Sidebar }         from "./components/layout/Sidebar"
export { Topbar }          from "./components/layout/Topbar"