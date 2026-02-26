export type TipoInstitucion = "PRIVADA" | "PUBLICA" | "TERCIARIO";
export type EstadoInstitucion = "ACTIVA" | "INACTIVA";

export class Institucion {
  private estado: EstadoInstitucion;

  constructor(
    public readonly id: string,
    public nombre: string,
    public readonly tipo: TipoInstitucion,
    public readonly cuit: string,
    public direccion: string,
    public telefono: string,
    public emailContacto: string,
    estado: EstadoInstitucion = "ACTIVA",
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {
    if (!nombre) throw new Error("El nombre es obligatorio");
    if (!cuit) throw new Error("El CUIT es obligatorio");

    this.estado = estado;
  }

  activar() {
    if (this.estado === "ACTIVA") return;
    this.estado = "ACTIVA";
    this.touch();
  }

  inactivar() {
    if (this.estado === "INACTIVA") return;
    this.estado = "INACTIVA";
    this.touch();
  }

  estaActiva(): boolean {
    return this.estado === "ACTIVA";
  }

  actualizarDatosContacto(
    direccion: string,
    telefono: string,
    email: string
  ) {
    this.direccion = direccion;
    this.telefono = telefono;
    this.emailContacto = email;
    this.touch();
  }

  private touch() {
    this.updatedAt = new Date();
  }
}