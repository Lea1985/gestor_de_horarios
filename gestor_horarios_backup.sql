--
-- PostgreSQL database dump
--

\restrict rUaTnCcwckf5qcLzWYs7CZDJ6UceExonifw7Rqv4mtoWlwJyea9Kts4NLohtPoq

-- Dumped from database version 15.17 (Debian 15.17-1.pgdg13+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: admin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO admin;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: admin
--

COMMENT ON SCHEMA public IS '';


--
-- Name: Dias; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."Dias" AS ENUM (
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO'
);


ALTER TYPE public."Dias" OWNER TO admin;

--
-- Name: Estado; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."Estado" AS ENUM (
    'ACTIVO',
    'INACTIVO',
    'SUSPENDIDO'
);


ALTER TYPE public."Estado" OWNER TO admin;

--
-- Name: EstadoClase; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."EstadoClase" AS ENUM (
    'PROGRAMADA',
    'DICTADA',
    'SUSPENDIDA',
    'REEMPLAZADA'
);


ALTER TYPE public."EstadoClase" OWNER TO admin;

--
-- Name: TipoUnidad; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."TipoUnidad" AS ENUM (
    'AULA',
    'LABORATORIO',
    'ADMIN',
    'OTRA'
);


ALTER TYPE public."TipoUnidad" OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Agente; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Agente" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    nombre text NOT NULL,
    apellido text NOT NULL,
    documento text NOT NULL,
    email text,
    telefono text,
    domicilio text,
    estado public."Estado" DEFAULT 'ACTIVO'::public."Estado" NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Agente" OWNER TO admin;

--
-- Name: Agente_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Agente_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Agente_id_seq" OWNER TO admin;

--
-- Name: Agente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Agente_id_seq" OWNED BY public."Agente".id;


--
-- Name: Asignacion; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Asignacion" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    "unidadId" integer NOT NULL,
    "identificadorEstructural" text NOT NULL,
    fecha_inicio timestamp(3) without time zone NOT NULL,
    fecha_fin timestamp(3) without time zone,
    estado public."Estado" DEFAULT 'ACTIVO'::public."Estado" NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "materiaId" integer,
    "comisionId" integer,
    "turnoId" integer NOT NULL
);


ALTER TABLE public."Asignacion" OWNER TO admin;

--
-- Name: Asignacion_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Asignacion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Asignacion_id_seq" OWNER TO admin;

--
-- Name: Asignacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Asignacion_id_seq" OWNED BY public."Asignacion".id;


--
-- Name: CalendarioEscolar; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."CalendarioEscolar" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    fecha timestamp(3) without time zone NOT NULL,
    descripcion text NOT NULL,
    "esFeriado" boolean DEFAULT false NOT NULL,
    "suspendeClases" boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "periodoOperativoId" integer NOT NULL
);


ALTER TABLE public."CalendarioEscolar" OWNER TO admin;

--
-- Name: CalendarioEscolar_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."CalendarioEscolar_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."CalendarioEscolar_id_seq" OWNER TO admin;

--
-- Name: CalendarioEscolar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."CalendarioEscolar_id_seq" OWNED BY public."CalendarioEscolar".id;


--
-- Name: ClaseProgramada; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."ClaseProgramada" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    "asignacionId" integer NOT NULL,
    "moduloId" integer,
    "unidadId" integer NOT NULL,
    "comisionId" integer,
    fecha timestamp(3) without time zone NOT NULL,
    estado public."EstadoClase" DEFAULT 'PROGRAMADA'::public."EstadoClase" NOT NULL,
    "incidenciaId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ClaseProgramada" OWNER TO admin;

--
-- Name: ClaseProgramada_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."ClaseProgramada_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."ClaseProgramada_id_seq" OWNER TO admin;

--
-- Name: ClaseProgramada_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."ClaseProgramada_id_seq" OWNED BY public."ClaseProgramada".id;


--
-- Name: Codigario; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Codigario" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Codigario" OWNER TO admin;

--
-- Name: CodigarioItem; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."CodigarioItem" (
    id integer NOT NULL,
    "codigarioId" integer NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CodigarioItem" OWNER TO admin;

--
-- Name: CodigarioItem_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."CodigarioItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."CodigarioItem_id_seq" OWNER TO admin;

--
-- Name: CodigarioItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."CodigarioItem_id_seq" OWNED BY public."CodigarioItem".id;


--
-- Name: Codigario_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Codigario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Codigario_id_seq" OWNER TO admin;

--
-- Name: Codigario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Codigario_id_seq" OWNED BY public."Codigario".id;


--
-- Name: Comision; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Comision" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    "cursoId" integer NOT NULL,
    "turnoId" integer NOT NULL,
    "unidadId" integer,
    nombre text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Comision" OWNER TO admin;

--
-- Name: Comision_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Comision_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Comision_id_seq" OWNER TO admin;

--
-- Name: Comision_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Comision_id_seq" OWNED BY public."Comision".id;


--
-- Name: Curso; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Curso" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Curso" OWNER TO admin;

--
-- Name: Curso_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Curso_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Curso_id_seq" OWNER TO admin;

--
-- Name: Curso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Curso_id_seq" OWNED BY public."Curso".id;


--
-- Name: DistribucionHoraria; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."DistribucionHoraria" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    "asignacionId" integer NOT NULL,
    version integer NOT NULL,
    fecha_vigencia_desde timestamp(3) without time zone NOT NULL,
    fecha_vigencia_hasta timestamp(3) without time zone,
    estado public."Estado" DEFAULT 'ACTIVO'::public."Estado" NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DistribucionHoraria" OWNER TO admin;

--
-- Name: DistribucionHoraria_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."DistribucionHoraria_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."DistribucionHoraria_id_seq" OWNER TO admin;

--
-- Name: DistribucionHoraria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."DistribucionHoraria_id_seq" OWNED BY public."DistribucionHoraria".id;


--
-- Name: DistribucionModulo; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."DistribucionModulo" (
    "distribucionHorariaId" integer NOT NULL,
    "moduloHorarioId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DistribucionModulo" OWNER TO admin;

--
-- Name: HorarioAsignado; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."HorarioAsignado" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    "agenteId" integer NOT NULL,
    "asignacionId" integer NOT NULL,
    "distribucionHorariaId" integer NOT NULL,
    "moduloHorarioId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HorarioAsignado" OWNER TO admin;

--
-- Name: HorarioAsignado_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."HorarioAsignado_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."HorarioAsignado_id_seq" OWNER TO admin;

--
-- Name: HorarioAsignado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."HorarioAsignado_id_seq" OWNED BY public."HorarioAsignado".id;


--
-- Name: Incidencia; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Incidencia" (
    id integer NOT NULL,
    "asignacionId" integer NOT NULL,
    fecha_desde timestamp(3) without time zone NOT NULL,
    fecha_hasta timestamp(3) without time zone NOT NULL,
    "codigarioItemId" integer NOT NULL,
    observacion text,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "incidenciaPadreId" integer
);


ALTER TABLE public."Incidencia" OWNER TO admin;

--
-- Name: Incidencia_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Incidencia_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Incidencia_id_seq" OWNER TO admin;

--
-- Name: Incidencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Incidencia_id_seq" OWNED BY public."Incidencia".id;


--
-- Name: Institucion; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Institucion" (
    id integer NOT NULL,
    nombre text NOT NULL,
    dominio text,
    configuracion jsonb,
    domicilio text,
    telefono text,
    email text,
    cuit text,
    estado public."Estado" DEFAULT 'ACTIVO'::public."Estado" NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Institucion" OWNER TO admin;

--
-- Name: Institucion_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Institucion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Institucion_id_seq" OWNER TO admin;

--
-- Name: Institucion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Institucion_id_seq" OWNED BY public."Institucion".id;


--
-- Name: Materia; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Materia" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    "cursoId" integer,
    nombre text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Materia" OWNER TO admin;

--
-- Name: Materia_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Materia_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Materia_id_seq" OWNER TO admin;

--
-- Name: Materia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Materia_id_seq" OWNED BY public."Materia".id;


--
-- Name: ModuloHorario; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."ModuloHorario" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    dia_semana public."Dias" NOT NULL,
    hora_desde integer NOT NULL,
    hora_hasta integer NOT NULL,
    "turnoId" integer,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ModuloHorario" OWNER TO admin;

--
-- Name: ModuloHorario_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."ModuloHorario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."ModuloHorario_id_seq" OWNER TO admin;

--
-- Name: ModuloHorario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."ModuloHorario_id_seq" OWNED BY public."ModuloHorario".id;


--
-- Name: PeriodoOperativo; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."PeriodoOperativo" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    nombre text NOT NULL,
    fecha_desde timestamp(3) without time zone NOT NULL,
    fecha_hasta timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    vigente boolean DEFAULT false NOT NULL
);


ALTER TABLE public."PeriodoOperativo" OWNER TO admin;

--
-- Name: PeriodoOperativo_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."PeriodoOperativo_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."PeriodoOperativo_id_seq" OWNER TO admin;

--
-- Name: PeriodoOperativo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."PeriodoOperativo_id_seq" OWNED BY public."PeriodoOperativo".id;


--
-- Name: Reemplazo; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Reemplazo" (
    id integer NOT NULL,
    "claseId" integer NOT NULL,
    "asignacionTitularId" integer NOT NULL,
    observacion text,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "agenteSuplenteId" integer NOT NULL
);


ALTER TABLE public."Reemplazo" OWNER TO admin;

--
-- Name: Reemplazo_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Reemplazo_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Reemplazo_id_seq" OWNER TO admin;

--
-- Name: Reemplazo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Reemplazo_id_seq" OWNED BY public."Reemplazo".id;


--
-- Name: Rol; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Rol" (
    id integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Rol" OWNER TO admin;

--
-- Name: Rol_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Rol_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Rol_id_seq" OWNER TO admin;

--
-- Name: Rol_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Rol_id_seq" OWNED BY public."Rol".id;


--
-- Name: Sesion; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Sesion" (
    id integer NOT NULL,
    "usuarioId" integer NOT NULL,
    "institucionId" integer NOT NULL,
    token text NOT NULL,
    ip text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Sesion" OWNER TO admin;

--
-- Name: Sesion_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Sesion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Sesion_id_seq" OWNER TO admin;

--
-- Name: Sesion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Sesion_id_seq" OWNED BY public."Sesion".id;


--
-- Name: TitularAsignacion; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."TitularAsignacion" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    "asignacionId" integer NOT NULL,
    "agenteId" integer NOT NULL,
    fecha_desde timestamp(3) without time zone NOT NULL,
    fecha_hasta timestamp(3) without time zone,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TitularAsignacion" OWNER TO admin;

--
-- Name: TitularAsignacion_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."TitularAsignacion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."TitularAsignacion_id_seq" OWNER TO admin;

--
-- Name: TitularAsignacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."TitularAsignacion_id_seq" OWNED BY public."TitularAsignacion".id;


--
-- Name: Turno; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Turno" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    nombre text NOT NULL,
    "horaInicio" integer NOT NULL,
    "horaFin" integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Turno" OWNER TO admin;

--
-- Name: Turno_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Turno_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Turno_id_seq" OWNER TO admin;

--
-- Name: Turno_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Turno_id_seq" OWNED BY public."Turno".id;


--
-- Name: UnidadOrganizativa; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."UnidadOrganizativa" (
    id integer NOT NULL,
    "institucionId" integer NOT NULL,
    "codigoUnidad" integer NOT NULL,
    nombre text NOT NULL,
    tipo public."TipoUnidad",
    estado public."Estado" DEFAULT 'ACTIVO'::public."Estado" NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UnidadOrganizativa" OWNER TO admin;

--
-- Name: UnidadOrganizativa_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."UnidadOrganizativa_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."UnidadOrganizativa_id_seq" OWNER TO admin;

--
-- Name: UnidadOrganizativa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."UnidadOrganizativa_id_seq" OWNED BY public."UnidadOrganizativa".id;


--
-- Name: Usuario; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Usuario" (
    id integer NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    nombre text,
    "esSuperAdmin" boolean DEFAULT false NOT NULL,
    estado public."Estado" DEFAULT 'ACTIVO'::public."Estado" NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Usuario" OWNER TO admin;

--
-- Name: UsuarioRol; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."UsuarioRol" (
    "usuarioId" integer NOT NULL,
    "rolId" integer NOT NULL,
    "institucionId" integer NOT NULL
);


ALTER TABLE public."UsuarioRol" OWNER TO admin;

--
-- Name: Usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Usuario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Usuario_id_seq" OWNER TO admin;

--
-- Name: Usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Usuario_id_seq" OWNED BY public."Usuario".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO admin;

--
-- Name: Agente id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Agente" ALTER COLUMN id SET DEFAULT nextval('public."Agente_id_seq"'::regclass);


--
-- Name: Asignacion id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asignacion" ALTER COLUMN id SET DEFAULT nextval('public."Asignacion_id_seq"'::regclass);


--
-- Name: CalendarioEscolar id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CalendarioEscolar" ALTER COLUMN id SET DEFAULT nextval('public."CalendarioEscolar_id_seq"'::regclass);


--
-- Name: ClaseProgramada id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ClaseProgramada" ALTER COLUMN id SET DEFAULT nextval('public."ClaseProgramada_id_seq"'::regclass);


--
-- Name: Codigario id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Codigario" ALTER COLUMN id SET DEFAULT nextval('public."Codigario_id_seq"'::regclass);


--
-- Name: CodigarioItem id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CodigarioItem" ALTER COLUMN id SET DEFAULT nextval('public."CodigarioItem_id_seq"'::regclass);


--
-- Name: Comision id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Comision" ALTER COLUMN id SET DEFAULT nextval('public."Comision_id_seq"'::regclass);


--
-- Name: Curso id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Curso" ALTER COLUMN id SET DEFAULT nextval('public."Curso_id_seq"'::regclass);


--
-- Name: DistribucionHoraria id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."DistribucionHoraria" ALTER COLUMN id SET DEFAULT nextval('public."DistribucionHoraria_id_seq"'::regclass);


--
-- Name: HorarioAsignado id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."HorarioAsignado" ALTER COLUMN id SET DEFAULT nextval('public."HorarioAsignado_id_seq"'::regclass);


--
-- Name: Incidencia id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Incidencia" ALTER COLUMN id SET DEFAULT nextval('public."Incidencia_id_seq"'::regclass);


--
-- Name: Institucion id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Institucion" ALTER COLUMN id SET DEFAULT nextval('public."Institucion_id_seq"'::regclass);


--
-- Name: Materia id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Materia" ALTER COLUMN id SET DEFAULT nextval('public."Materia_id_seq"'::regclass);


--
-- Name: ModuloHorario id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ModuloHorario" ALTER COLUMN id SET DEFAULT nextval('public."ModuloHorario_id_seq"'::regclass);


--
-- Name: PeriodoOperativo id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."PeriodoOperativo" ALTER COLUMN id SET DEFAULT nextval('public."PeriodoOperativo_id_seq"'::regclass);


--
-- Name: Reemplazo id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Reemplazo" ALTER COLUMN id SET DEFAULT nextval('public."Reemplazo_id_seq"'::regclass);


--
-- Name: Rol id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Rol" ALTER COLUMN id SET DEFAULT nextval('public."Rol_id_seq"'::regclass);


--
-- Name: Sesion id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Sesion" ALTER COLUMN id SET DEFAULT nextval('public."Sesion_id_seq"'::regclass);


--
-- Name: TitularAsignacion id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."TitularAsignacion" ALTER COLUMN id SET DEFAULT nextval('public."TitularAsignacion_id_seq"'::regclass);


--
-- Name: Turno id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Turno" ALTER COLUMN id SET DEFAULT nextval('public."Turno_id_seq"'::regclass);


--
-- Name: UnidadOrganizativa id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UnidadOrganizativa" ALTER COLUMN id SET DEFAULT nextval('public."UnidadOrganizativa_id_seq"'::regclass);


--
-- Name: Usuario id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Usuario" ALTER COLUMN id SET DEFAULT nextval('public."Usuario_id_seq"'::regclass);


--
-- Data for Name: Agente; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Agente" (id, "institucionId", nombre, apellido, documento, email, telefono, domicilio, estado, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	María	García	25111222	garcia.maria@escuela12.edu.ar	0341-155001001	Pellegrini 800, Rosario	ACTIVO	t	\N	2026-05-24 15:22:16.643	2026-05-24 15:22:16.643
3	2	Carlos	Fernández	28333444	fernandez@sanatoriosur.com.ar	\N	\N	ACTIVO	t	\N	2026-05-24 15:22:16.657	2026-05-24 15:22:16.657
4	2	Laura	Rodríguez	32444555	rodriguez.laura@gmail.com	\N	\N	ACTIVO	t	\N	2026-05-24 15:22:16.661	2026-05-24 15:22:16.661
5	1	leandro	alegre	31931828	leandroa.alegre@gmail.com	03413151474	3 de febrero 4579	ACTIVO	t	\N	2026-05-24 15:24:59.189	2026-05-24 15:24:59.189
6	1	Gabriela	Al	12345678	asad@asda.com	1231231231	aasda 231	ACTIVO	t	\N	2026-05-25 11:57:46.996	2026-05-25 11:57:46.996
2	1	Juan	López	30222333	lopez.juan@escuela12.edu.ar	12312321		ACTIVO	t	\N	2026-05-24 15:22:16.652	2026-05-29 22:52:39.178
\.


--
-- Data for Name: Asignacion; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Asignacion" (id, "institucionId", "unidadId", "identificadorEstructural", fecha_inicio, fecha_fin, estado, activo, "deletedAt", "createdAt", "updatedAt", "materiaId", "comisionId", "turnoId") FROM stdin;
1	1	1	DOC-1A-LENGUA	2025-03-01 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:22:16.665	2026-05-24 15:22:16.665	1	1	1
2	1	3	DIR-001	2024-03-01 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:22:16.674	2026-05-24 15:22:16.674	\N	\N	1
3	1	2	DOC-2A-MAT	2025-03-01 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:22:16.679	2026-05-24 15:22:16.679	2	2	2
4	1	4	DOC-1A-CIEN	2025-03-01 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:22:16.683	2026-05-24 15:22:16.683	3	1	1
5	2	5	MED-UTI-MAN	2024-01-01 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:22:16.689	2026-05-24 15:22:16.689	\N	3	3
6	2	6	ENF-GUAR-NOC	2024-06-01 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:22:16.694	2026-05-24 15:22:16.694	\N	4	5
7	1	1	111111	2026-03-02 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:26:43.032	2026-05-27 20:31:08.372	4	1	1
\.


--
-- Data for Name: CalendarioEscolar; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."CalendarioEscolar" (id, "institucionId", fecha, descripcion, "esFeriado", "suspendeClases", activo, "deletedAt", "createdAt", "updatedAt", "periodoOperativoId") FROM stdin;
1	1	2025-04-02 00:00:00	Feriado Nacional - Malvinas	t	t	t	\N	2026-05-24 15:22:16.862	2026-05-24 15:22:16.862	1
2	1	2025-07-07 00:00:00	Inicio receso invernal	f	t	t	\N	2026-05-24 15:22:16.862	2026-05-24 15:22:16.862	1
\.


--
-- Data for Name: ClaseProgramada; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ClaseProgramada" (id, "institucionId", "asignacionId", "moduloId", "unidadId", "comisionId", fecha, estado, "incidenciaId", "createdAt", "updatedAt") FROM stdin;
1	1	1	1	1	1	2025-04-07 10:40:00	DICTADA	\N	2026-05-24 15:22:16.81	2026-05-24 15:22:16.81
3	1	3	2	2	2	2025-04-07 11:20:00	PROGRAMADA	\N	2026-05-24 15:22:16.823	2026-05-24 15:22:16.823
2	1	1	3	1	1	2025-04-09 10:40:00	REEMPLAZADA	1	2026-05-24 15:22:16.817	2026-05-24 15:22:16.86
4	1	7	1	1	1	2026-02-03 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
5	1	7	3	1	1	2026-02-05 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
6	1	7	1	1	1	2026-02-10 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
7	1	7	3	1	1	2026-02-12 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
8	1	7	1	1	1	2026-02-17 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
9	1	7	3	1	1	2026-02-19 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
10	1	7	1	1	1	2026-02-24 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
11	1	7	3	1	1	2026-02-26 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
12	1	7	1	1	1	2026-03-03 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
13	1	7	3	1	1	2026-03-05 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
14	1	7	1	1	1	2026-03-10 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
15	1	7	3	1	1	2026-03-12 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
16	1	7	1	1	1	2026-03-17 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
17	1	7	3	1	1	2026-03-19 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
18	1	7	1	1	1	2026-03-24 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
19	1	7	3	1	1	2026-03-26 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
20	1	7	1	1	1	2026-03-31 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
21	1	7	3	1	1	2026-04-02 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
22	1	7	1	1	1	2026-04-07 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
23	1	7	3	1	1	2026-04-09 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
24	1	7	1	1	1	2026-04-14 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
25	1	7	3	1	1	2026-04-16 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
26	1	7	1	1	1	2026-04-21 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
27	1	7	3	1	1	2026-04-23 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
28	1	7	1	1	1	2026-04-28 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
29	1	7	3	1	1	2026-04-30 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
30	1	7	1	1	1	2026-05-05 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
31	1	7	3	1	1	2026-05-07 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
32	1	7	1	1	1	2026-05-12 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
33	1	7	3	1	1	2026-05-14 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
34	1	7	1	1	1	2026-05-19 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
35	1	7	3	1	1	2026-05-21 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
38	1	7	1	1	1	2026-06-02 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
39	1	7	3	1	1	2026-06-04 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
40	1	7	1	1	1	2026-06-09 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
41	1	7	3	1	1	2026-06-11 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
42	1	7	1	1	1	2026-06-16 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
43	1	7	3	1	1	2026-06-18 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
44	1	7	1	1	1	2026-06-23 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
45	1	7	3	1	1	2026-06-25 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
46	1	7	1	1	1	2026-06-30 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
47	1	7	3	1	1	2026-07-02 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
48	1	7	1	1	1	2026-07-07 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
49	1	7	3	1	1	2026-07-09 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
50	1	7	1	1	1	2026-07-14 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
51	1	7	3	1	1	2026-07-16 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
53	1	7	3	1	1	2026-07-23 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
54	1	7	1	1	1	2026-07-28 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
55	1	7	3	1	1	2026-07-30 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
64	1	7	1	1	1	2026-09-01 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
65	1	7	3	1	1	2026-09-03 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
66	1	7	1	1	1	2026-09-08 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
67	1	7	3	1	1	2026-09-10 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
68	1	7	1	1	1	2026-09-15 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
69	1	7	3	1	1	2026-09-17 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
70	1	7	1	1	1	2026-09-22 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
71	1	7	3	1	1	2026-09-24 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
72	1	7	1	1	1	2026-09-29 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
73	1	7	3	1	1	2026-10-01 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
74	1	7	1	1	1	2026-10-06 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
75	1	7	3	1	1	2026-10-08 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
76	1	7	1	1	1	2026-10-13 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
77	1	7	3	1	1	2026-10-15 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
78	1	7	1	1	1	2026-10-20 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
79	1	7	3	1	1	2026-10-22 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
80	1	7	1	1	1	2026-10-27 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
81	1	7	3	1	1	2026-10-29 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
82	1	7	1	1	1	2026-11-03 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
83	1	7	3	1	1	2026-11-05 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
84	1	7	1	1	1	2026-11-10 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
85	1	7	3	1	1	2026-11-12 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
86	1	7	1	1	1	2026-11-17 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
52	1	7	1	1	1	2026-07-21 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-24 23:29:10.943
36	1	7	1	1	1	2026-05-26 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 22:52:43.891
57	1	7	3	1	1	2026-08-06 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-24 23:34:14.56
56	1	7	1	1	1	2026-08-04 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-24 23:34:14.562
60	1	7	1	1	1	2026-08-18 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-24 23:34:14.596
59	1	7	3	1	1	2026-08-13 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-24 23:34:14.596
62	1	7	1	1	1	2026-08-25 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-24 23:34:14.637
63	1	7	3	1	1	2026-08-27 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-24 23:34:14.638
37	1	7	3	1	1	2026-05-28 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-25 14:56:13.233
87	1	7	3	1	1	2026-11-19 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
88	1	7	1	1	1	2026-11-24 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
89	1	7	3	1	1	2026-11-26 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
90	1	7	1	1	1	2026-12-01 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
91	1	7	3	1	1	2026-12-03 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
92	1	7	1	1	1	2026-12-08 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
93	1	7	3	1	1	2026-12-10 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
94	1	7	1	1	1	2026-12-15 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
95	1	7	3	1	1	2026-12-17 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
96	1	7	1	1	1	2026-12-22 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
97	1	7	3	1	1	2026-12-24 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
98	1	7	1	1	1	2026-12-29 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
99	1	7	3	1	1	2026-12-31 00:00:00	PROGRAMADA	\N	2026-05-24 15:30:15.661	2026-05-24 15:30:15.661
58	1	7	1	1	1	2026-08-11 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-24 23:34:14.566
61	1	7	3	1	1	2026-08-20 00:00:00	REEMPLAZADA	\N	2026-05-24 15:30:15.661	2026-05-24 23:34:14.569
\.


--
-- Data for Name: Codigario; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Codigario" (id, "institucionId", nombre, descripcion, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	Ausentismo Docente	Códigos de ausencia para docentes	t	\N	2026-05-24 15:22:16.608	2026-05-24 15:22:16.608
2	2	Ausentismo Personal	Códigos de ausencia para personal de salud	t	\N	2026-05-24 15:22:16.632	2026-05-24 15:22:16.632
\.


--
-- Data for Name: CodigarioItem; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."CodigarioItem" (id, "codigarioId", codigo, nombre, descripcion, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	ENF	Enfermedad	Ausencia por enfermedad con certificado médico	t	\N	2026-05-24 15:22:16.615	2026-05-24 15:22:16.615
2	1	LIC	Licencia	Licencia ordinaria	t	\N	2026-05-24 15:22:16.627	2026-05-24 15:22:16.627
3	2	ART	Accidente de trabajo	Ausencia por ART	t	\N	2026-05-24 15:22:16.636	2026-05-24 15:22:16.636
\.


--
-- Data for Name: Comision; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Comision" (id, "institucionId", "cursoId", "turnoId", "unidadId", nombre, descripcion, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1	1	1	1°A	Primera división turno mañana	t	\N	2026-05-24 15:22:16.561	2026-05-24 15:22:16.561
2	1	2	2	2	2°A	Segunda división turno tarde	t	\N	2026-05-24 15:22:16.57	2026-05-24 15:22:16.57
3	2	3	3	5	Guardia Mañana UTI	\N	t	\N	2026-05-24 15:22:16.575	2026-05-24 15:22:16.575
4	2	4	5	\N	Guardia Noche Central	\N	t	\N	2026-05-24 15:22:16.581	2026-05-24 15:22:16.581
\.


--
-- Data for Name: Curso; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Curso" (id, "institucionId", nombre, descripcion, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1° Año	Primer año primaria	t	\N	2026-05-24 15:22:16.541	2026-05-24 15:22:16.541
2	1	2° Año	Segundo año primaria	t	\N	2026-05-24 15:22:16.547	2026-05-24 15:22:16.547
3	2	Sector UTI	Unidad de Terapia Intensiva	t	\N	2026-05-24 15:22:16.551	2026-05-24 15:22:16.551
4	2	Sector Guardia	Guardia Central	t	\N	2026-05-24 15:22:16.556	2026-05-24 15:22:16.556
5	1	3° Año	Tercer año primario	t	\N	2026-06-01 20:52:10.426	2026-06-01 20:52:10.426
\.


--
-- Data for Name: DistribucionHoraria; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."DistribucionHoraria" (id, "institucionId", "asignacionId", version, fecha_vigencia_desde, fecha_vigencia_hasta, estado, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1	1	2025-03-01 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:22:16.758	2026-05-24 15:22:16.758
2	1	3	1	2025-03-01 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:22:16.78	2026-05-24 15:22:16.78
3	1	7	1	2026-02-02 00:00:00	\N	ACTIVO	t	\N	2026-05-24 15:29:50.923	2026-05-24 15:29:50.923
\.


--
-- Data for Name: DistribucionModulo; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."DistribucionModulo" ("distribucionHorariaId", "moduloHorarioId", "createdAt", "updatedAt") FROM stdin;
1	1	2026-05-24 15:22:16.765	2026-05-24 15:22:16.765
1	3	2026-05-24 15:22:16.774	2026-05-24 15:22:16.774
2	2	2026-05-24 15:22:16.788	2026-05-24 15:22:16.788
3	1	2026-05-24 15:30:15.638	2026-05-24 15:30:15.638
3	3	2026-05-24 15:30:15.638	2026-05-24 15:30:15.638
\.


--
-- Data for Name: HorarioAsignado; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."HorarioAsignado" (id, "institucionId", "agenteId", "asignacionId", "distribucionHorariaId", "moduloHorarioId", "createdAt") FROM stdin;
1	1	1	1	1	1	2026-05-24 15:22:16.792
2	1	1	1	1	3	2026-05-24 15:22:16.799
\.


--
-- Data for Name: Incidencia; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Incidencia" (id, "asignacionId", fecha_desde, fecha_hasta, "codigarioItemId", observacion, activo, "deletedAt", "createdAt", "updatedAt", "incidenciaPadreId") FROM stdin;
2	7	2026-05-11 00:00:00	2026-05-15 00:00:00	2	\N	t	\N	2026-05-24 15:31:36.394	2026-05-24 15:31:36.394	\N
3	7	2026-05-26 00:00:00	2026-05-29 00:00:00	1	\N	t	\N	2026-05-24 22:51:05.436	2026-05-24 22:51:05.436	\N
6	7	2026-05-28 00:00:00	2026-05-28 00:00:00	1	\N	t	\N	2026-05-25 14:56:12.933	2026-05-25 14:56:12.933	5
1	1	2025-04-09 00:00:00	2025-04-11 00:00:00	1	Certificado médico presentado	f	2026-05-26 20:43:16.876	2026-05-24 15:22:16.827	2026-05-26 20:43:16.878	\N
4	7	2026-07-20 00:00:00	2026-07-21 00:00:00	1	\N	f	2026-05-27 18:51:42.716	2026-05-24 23:26:55.764	2026-05-27 18:51:42.717	\N
5	7	2026-08-03 00:00:00	2026-08-28 00:00:00	2	\N	t	\N	2026-05-24 23:33:45.346	2026-05-27 18:58:49.076	\N
\.


--
-- Data for Name: Institucion; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Institucion" (id, nombre, dominio, configuracion, domicilio, telefono, email, cuit, estado, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	Escuela Primaria N°12	escuela12.edu.ar	{"usaCursos": true, "usaMaterias": true, "modulosDuracionMinutos": 40}	Av. San Martín 450, Rosario	0341-4100100	info@escuela12.edu.ar	30-12345678-9	ACTIVO	t	\N	2026-05-24 15:22:16.432	2026-05-24 15:22:16.432
2	Sanatorio del Sur	sanatoriosur.com.ar	{"usaCursos": false, "usaMaterias": false, "modulosDuracionMinutos": 60}	Córdoba 1200, Rosario	0341-4200200	info@sanatoriosur.com.ar	30-98765432-1	ACTIVO	t	\N	2026-05-24 15:22:16.444	2026-05-24 15:22:16.444
\.


--
-- Data for Name: Materia; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Materia" (id, "institucionId", "cursoId", nombre, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1	Lengua	t	\N	2026-05-24 15:22:16.587	2026-05-24 15:22:16.587
2	1	2	Matemática	t	\N	2026-05-24 15:22:16.596	2026-05-24 15:22:16.596
3	1	1	Ciencias Naturales	t	\N	2026-05-24 15:22:16.6	2026-05-24 15:22:16.6
4	1	1	Ruedas de convivencia	t	\N	2026-05-24 15:25:20.214	2026-05-24 15:25:20.214
\.


--
-- Data for Name: ModuloHorario; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ModuloHorario" (id, "institucionId", dia_semana, hora_desde, hora_hasta, "turnoId", activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	LUNES	460	500	1	t	\N	2026-05-24 15:22:16.732	2026-05-24 15:22:16.732
2	1	LUNES	500	540	1	t	\N	2026-05-24 15:22:16.742	2026-05-24 15:22:16.742
3	1	MIERCOLES	460	500	1	t	\N	2026-05-24 15:22:16.746	2026-05-24 15:22:16.746
4	2	LUNES	420	780	3	t	\N	2026-05-24 15:22:16.751	2026-05-24 15:22:16.751
\.


--
-- Data for Name: PeriodoOperativo; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."PeriodoOperativo" (id, "institucionId", nombre, fecha_desde, fecha_hasta, "deletedAt", "createdAt", "updatedAt", vigente) FROM stdin;
2	2	Ejercicio 2025	2025-01-01 00:00:00	2025-12-31 00:00:00	\N	2026-05-24 15:22:16.461	2026-05-24 15:22:16.461	t
1	1	Ciclo Lectivo 2025	2025-03-01 00:00:00	2025-12-20 00:00:00	\N	2026-05-24 15:22:16.451	2026-05-24 15:28:37.743	f
3	1	Ciclo lectivo 2026	2026-01-01 00:00:00	2026-12-31 00:00:00	\N	2026-05-24 15:28:24.339	2026-05-24 15:28:37.75	t
\.


--
-- Data for Name: Reemplazo; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Reemplazo" (id, "claseId", "asignacionTitularId", observacion, activo, "deletedAt", "createdAt", "agenteSuplenteId") FROM stdin;
1	2	1	Reemplazo de emergencia por enfermedad titular	t	\N	2026-05-24 15:22:16.85	2
3	36	7	\N	f	2026-05-24 22:52:43.889	2026-05-24 22:52:16.894	2
2	37	7	\N	f	2026-05-24 22:52:46.068	2026-05-24 22:52:16.892	2
4	52	7	\N	t	\N	2026-05-24 23:29:10.943	1
5	57	7	\N	t	\N	2026-05-24 23:34:14.56	2
6	56	7	\N	t	\N	2026-05-24 23:34:14.562	2
7	58	7	\N	t	\N	2026-05-24 23:34:14.566	2
8	61	7	\N	t	\N	2026-05-24 23:34:14.569	2
9	60	7	\N	t	\N	2026-05-24 23:34:14.596	2
10	59	7	\N	t	\N	2026-05-24 23:34:14.596	2
11	62	7	\N	t	\N	2026-05-24 23:34:14.637	2
12	63	7	\N	t	\N	2026-05-24 23:34:14.638	2
13	37	7	\N	t	\N	2026-05-25 14:56:13.233	6
\.


--
-- Data for Name: Rol; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Rol" (id, nombre, descripcion, "createdAt") FROM stdin;
1	ADMIN	Administrador de institución	2026-05-24 15:22:16.336
2	DIRECTIVO	Director o vicedirector	2026-05-24 15:22:16.343
3	DOCENTE	Profesor / docente	2026-05-24 15:22:16.346
4	VIEWER	Solo lectura	2026-05-24 15:22:16.35
\.


--
-- Data for Name: Sesion; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Sesion" (id, "usuarioId", "institucionId", token, ip, "userAgent", "createdAt", "expiresAt") FROM stdin;
1	2	1	token-admin-escuela-seed-001	192.168.1.10	Mozilla/5.0	2026-05-24 15:22:16.489	2026-05-24 23:22:16.487
2	3	2	token-admin-sanatorio-seed-001	192.168.1.20	Mozilla/5.0	2026-05-24 15:22:16.489	2026-05-24 23:22:16.488
3	2	1	410c86a7-2874-4d3e-8360-f6e2977cd0ab	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-24 15:22:52.958	2026-05-31 15:22:52.957
4	2	1	adf8434d-e0ed-4e0e-88ef-883bca1435e7	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-24 23:21:47.75	2026-05-31 23:21:47.749
6	2	1	173f2d64-93b8-4076-8254-38cf1cfb0d48	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-25 10:52:29.304	2026-06-01 10:52:29.303
9	2	1	889d751f-85dc-4db9-874a-09829c79e13f	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-25 11:56:23.178	2026-06-01 11:56:23.177
10	2	1	b8569c82-8fd2-410b-b16d-59ff39ca1bd9	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-25 14:52:54.308	2026-06-01 14:52:54.307
12	2	1	fd7933d0-4c53-4211-8dd9-f66fd5478f3b	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-26 17:07:11.73	2026-06-02 17:07:11.729
16	2	1	26689d4d-265a-4495-91aa-d6c64043553b	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-30 13:41:17.267	2026-06-06 13:41:17.266
18	2	1	38d1087c-4a04-402f-9add-d32e2130aa67	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-06-02 19:07:21.148	2026-06-09 19:07:21.146
\.


--
-- Data for Name: TitularAsignacion; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."TitularAsignacion" (id, "institucionId", "asignacionId", "agenteId", fecha_desde, fecha_hasta, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1	1	2025-03-01 00:00:00	\N	t	\N	2026-05-24 15:22:16.704	2026-05-24 15:22:16.704
2	1	2	1	2024-03-01 00:00:00	\N	t	\N	2026-05-24 15:22:16.71	2026-05-24 15:22:16.71
3	1	3	2	2025-03-01 00:00:00	\N	t	\N	2026-05-24 15:22:16.713	2026-05-24 15:22:16.713
4	1	4	2	2025-03-01 00:00:00	\N	t	\N	2026-05-24 15:22:16.717	2026-05-24 15:22:16.717
5	2	5	3	2024-01-01 00:00:00	\N	t	\N	2026-05-24 15:22:16.723	2026-05-24 15:22:16.723
6	2	6	4	2024-06-01 00:00:00	\N	t	\N	2026-05-24 15:22:16.728	2026-05-24 15:22:16.728
7	1	7	5	2026-03-02 00:00:00	2026-05-27 20:30:57.872	f	\N	2026-05-24 15:26:43.056	2026-05-27 20:30:57.877
8	1	7	5	2026-05-27 20:32:38.593	\N	t	\N	2026-05-27 20:32:38.607	2026-05-27 20:32:38.607
\.


--
-- Data for Name: Turno; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Turno" (id, "institucionId", nombre, "horaInicio", "horaFin", activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	Mañana	420	720	t	\N	2026-05-24 15:22:16.493	2026-05-24 15:22:16.493
2	1	Tarde	780	1020	t	\N	2026-05-24 15:22:16.499	2026-05-24 15:22:16.499
3	2	Mañana	420	840	t	\N	2026-05-24 15:22:16.505	2026-05-24 15:22:16.505
4	2	Tarde	840	1260	t	\N	2026-05-24 15:22:16.509	2026-05-24 15:22:16.509
5	2	Noche	1260	420	t	\N	2026-05-24 15:22:16.511	2026-05-24 15:22:16.511
\.


--
-- Data for Name: UnidadOrganizativa; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."UnidadOrganizativa" (id, "institucionId", "codigoUnidad", nombre, tipo, estado, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1	Aula 1°A	AULA	ACTIVO	t	\N	2026-05-24 15:22:16.515	2026-05-24 15:22:16.515
2	1	2	Aula 2°A	AULA	ACTIVO	t	\N	2026-05-24 15:22:16.523	2026-05-24 15:22:16.523
3	1	99	Dirección	ADMIN	ACTIVO	t	\N	2026-05-24 15:22:16.526	2026-05-24 15:22:16.526
4	1	10	Laboratorio de Ciencias	LABORATORIO	ACTIVO	t	\N	2026-05-24 15:22:16.529	2026-05-24 15:22:16.529
5	2	1	UTI	OTRA	ACTIVO	t	\N	2026-05-24 15:22:16.532	2026-05-24 15:22:16.532
6	2	2	Guardia Central	OTRA	ACTIVO	t	\N	2026-05-24 15:22:16.536	2026-05-24 15:22:16.536
\.


--
-- Data for Name: Usuario; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Usuario" (id, email, "passwordHash", nombre, "esSuperAdmin", estado, activo, "createdAt", "updatedAt") FROM stdin;
1	superadmin@plataforma.com	$2b$10$ymK4PRl31JnXeiS5JZrvnuViOovYHWIs6/KWlYV0fDHDaRS8pvHb.	Super Admin	t	ACTIVO	t	2026-05-24 15:22:16.413	2026-05-24 15:22:16.413
2	admin@escuela12.edu.ar	$2b$10$ymK4PRl31JnXeiS5JZrvnuViOovYHWIs6/KWlYV0fDHDaRS8pvHb.	Admin Escuela	f	ACTIVO	t	2026-05-24 15:22:16.423	2026-05-24 15:22:16.423
3	admin@sanatoriosur.com.ar	$2b$10$ymK4PRl31JnXeiS5JZrvnuViOovYHWIs6/KWlYV0fDHDaRS8pvHb.	Admin Sanatorio	f	ACTIVO	t	2026-05-24 15:22:16.426	2026-05-24 15:22:16.426
4	garcia.maria@escuela12.edu.ar	$2b$10$ymK4PRl31JnXeiS5JZrvnuViOovYHWIs6/KWlYV0fDHDaRS8pvHb.	María García	f	ACTIVO	t	2026-05-24 15:22:16.429	2026-05-24 15:22:16.429
\.


--
-- Data for Name: UsuarioRol; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."UsuarioRol" ("usuarioId", "rolId", "institucionId") FROM stdin;
1	1	1
1	1	2
2	1	1
3	1	2
4	3	1
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
72b1ef10-2185-4c0d-918f-2dea4cebe716	beed725451f04e2b48d7691e42c5887f0a8bb9da3db8c36cfacdeac9da3d06df	2026-05-24 15:22:11.708966+00	20260515213133_init	\N	\N	2026-05-24 15:22:11.264454+00	1
e45c13be-e2e4-4adc-bf0d-1104a274a899	1921fa6a3c4c15609cee3dac976b7dd8f3d681d6090ae9cf17981cedc15445a6	2026-05-24 15:22:11.723332+00	20260521201259_add_agente_suplente_reemplazo	\N	\N	2026-05-24 15:22:11.711124+00	1
944d2e4a-d92e-4633-b566-d490eb91e5aa	cdfbddb27e88781e2330607ec9fd0c6ce1a692db10fb5df436862744025313dd	2026-05-24 15:22:11.754255+00	20260523145022_add_periodo_operativo	\N	\N	2026-05-24 15:22:11.725216+00	1
735cb73f-9e70-402c-a46e-2e5d560259a3	9b9795f2b56d536d26705d90f67becd5d37230bb87de81d47f483b71c38ffe79	2026-05-24 15:22:11.765166+00	20260523223108_rename_activo_to_vigente_periodo_operativo	\N	\N	2026-05-24 15:22:11.755754+00	1
137b5170-b115-45d6-8f7b-de7945fc51ff	700f00c4d51c0450406e1e8f184fa2945ccfc3c49963ee139ef7ec453f8fd756	2026-05-24 23:03:27.125294+00	20260524230327_add_cadena_reemplazo	\N	\N	2026-05-24 23:03:27.09627+00	1
40a69fa0-b686-4622-8d7d-455fc78a38d8	5cd66bdfc0fd03c2b71906fc5f64d66db513741093f156ecaec55a71a3a311a3	2026-05-25 11:06:14.720426+00	20260525110614_remove_cadena_reemplazo	\N	\N	2026-05-25 11:06:14.707505+00	1
\.


--
-- Name: Agente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Agente_id_seq"', 6, true);


--
-- Name: Asignacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Asignacion_id_seq"', 7, true);


--
-- Name: CalendarioEscolar_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."CalendarioEscolar_id_seq"', 2, true);


--
-- Name: ClaseProgramada_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."ClaseProgramada_id_seq"', 99, true);


--
-- Name: CodigarioItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."CodigarioItem_id_seq"', 3, true);


--
-- Name: Codigario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Codigario_id_seq"', 2, true);


--
-- Name: Comision_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Comision_id_seq"', 4, true);


--
-- Name: Curso_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Curso_id_seq"', 5, true);


--
-- Name: DistribucionHoraria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."DistribucionHoraria_id_seq"', 3, true);


--
-- Name: HorarioAsignado_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."HorarioAsignado_id_seq"', 2, true);


--
-- Name: Incidencia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Incidencia_id_seq"', 6, true);


--
-- Name: Institucion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Institucion_id_seq"', 2, true);


--
-- Name: Materia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Materia_id_seq"', 4, true);


--
-- Name: ModuloHorario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."ModuloHorario_id_seq"', 4, true);


--
-- Name: PeriodoOperativo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."PeriodoOperativo_id_seq"', 3, true);


--
-- Name: Reemplazo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Reemplazo_id_seq"', 13, true);


--
-- Name: Rol_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Rol_id_seq"', 4, true);


--
-- Name: Sesion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Sesion_id_seq"', 18, true);


--
-- Name: TitularAsignacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."TitularAsignacion_id_seq"', 8, true);


--
-- Name: Turno_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Turno_id_seq"', 5, true);


--
-- Name: UnidadOrganizativa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."UnidadOrganizativa_id_seq"', 6, true);


--
-- Name: Usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Usuario_id_seq"', 4, true);


--
-- Name: Agente Agente_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Agente"
    ADD CONSTRAINT "Agente_pkey" PRIMARY KEY (id);


--
-- Name: Asignacion Asignacion_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asignacion"
    ADD CONSTRAINT "Asignacion_pkey" PRIMARY KEY (id);


--
-- Name: CalendarioEscolar CalendarioEscolar_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CalendarioEscolar"
    ADD CONSTRAINT "CalendarioEscolar_pkey" PRIMARY KEY (id);


--
-- Name: ClaseProgramada ClaseProgramada_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ClaseProgramada"
    ADD CONSTRAINT "ClaseProgramada_pkey" PRIMARY KEY (id);


--
-- Name: CodigarioItem CodigarioItem_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CodigarioItem"
    ADD CONSTRAINT "CodigarioItem_pkey" PRIMARY KEY (id);


--
-- Name: Codigario Codigario_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Codigario"
    ADD CONSTRAINT "Codigario_pkey" PRIMARY KEY (id);


--
-- Name: Comision Comision_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Comision"
    ADD CONSTRAINT "Comision_pkey" PRIMARY KEY (id);


--
-- Name: Curso Curso_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Curso"
    ADD CONSTRAINT "Curso_pkey" PRIMARY KEY (id);


--
-- Name: DistribucionHoraria DistribucionHoraria_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."DistribucionHoraria"
    ADD CONSTRAINT "DistribucionHoraria_pkey" PRIMARY KEY (id);


--
-- Name: DistribucionModulo DistribucionModulo_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."DistribucionModulo"
    ADD CONSTRAINT "DistribucionModulo_pkey" PRIMARY KEY ("distribucionHorariaId", "moduloHorarioId");


--
-- Name: HorarioAsignado HorarioAsignado_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."HorarioAsignado"
    ADD CONSTRAINT "HorarioAsignado_pkey" PRIMARY KEY (id);


--
-- Name: Incidencia Incidencia_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Incidencia"
    ADD CONSTRAINT "Incidencia_pkey" PRIMARY KEY (id);


--
-- Name: Institucion Institucion_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Institucion"
    ADD CONSTRAINT "Institucion_pkey" PRIMARY KEY (id);


--
-- Name: Materia Materia_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Materia"
    ADD CONSTRAINT "Materia_pkey" PRIMARY KEY (id);


--
-- Name: ModuloHorario ModuloHorario_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ModuloHorario"
    ADD CONSTRAINT "ModuloHorario_pkey" PRIMARY KEY (id);


--
-- Name: PeriodoOperativo PeriodoOperativo_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."PeriodoOperativo"
    ADD CONSTRAINT "PeriodoOperativo_pkey" PRIMARY KEY (id);


--
-- Name: Reemplazo Reemplazo_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Reemplazo"
    ADD CONSTRAINT "Reemplazo_pkey" PRIMARY KEY (id);


--
-- Name: Rol Rol_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Rol"
    ADD CONSTRAINT "Rol_pkey" PRIMARY KEY (id);


--
-- Name: Sesion Sesion_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Sesion"
    ADD CONSTRAINT "Sesion_pkey" PRIMARY KEY (id);


--
-- Name: TitularAsignacion TitularAsignacion_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."TitularAsignacion"
    ADD CONSTRAINT "TitularAsignacion_pkey" PRIMARY KEY (id);


--
-- Name: Turno Turno_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Turno"
    ADD CONSTRAINT "Turno_pkey" PRIMARY KEY (id);


--
-- Name: UnidadOrganizativa UnidadOrganizativa_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UnidadOrganizativa"
    ADD CONSTRAINT "UnidadOrganizativa_pkey" PRIMARY KEY (id);


--
-- Name: UsuarioRol UsuarioRol_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UsuarioRol"
    ADD CONSTRAINT "UsuarioRol_pkey" PRIMARY KEY ("usuarioId", "rolId", "institucionId");


--
-- Name: Usuario Usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Agente_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Agente_activo_idx" ON public."Agente" USING btree (activo);


--
-- Name: Agente_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Agente_deletedAt_idx" ON public."Agente" USING btree ("deletedAt");


--
-- Name: Agente_institucionId_documento_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Agente_institucionId_documento_key" ON public."Agente" USING btree ("institucionId", documento);


--
-- Name: Agente_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Agente_institucionId_idx" ON public."Agente" USING btree ("institucionId");


--
-- Name: Asignacion_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Asignacion_activo_idx" ON public."Asignacion" USING btree (activo);


--
-- Name: Asignacion_comisionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Asignacion_comisionId_idx" ON public."Asignacion" USING btree ("comisionId");


--
-- Name: Asignacion_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Asignacion_deletedAt_idx" ON public."Asignacion" USING btree ("deletedAt");


--
-- Name: Asignacion_institucionId_identificadorEstructural_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Asignacion_institucionId_identificadorEstructural_key" ON public."Asignacion" USING btree ("institucionId", "identificadorEstructural");


--
-- Name: Asignacion_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Asignacion_institucionId_idx" ON public."Asignacion" USING btree ("institucionId");


--
-- Name: Asignacion_institucionId_unidadId_fecha_inicio_fecha_fin_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Asignacion_institucionId_unidadId_fecha_inicio_fecha_fin_idx" ON public."Asignacion" USING btree ("institucionId", "unidadId", fecha_inicio, fecha_fin);


--
-- Name: Asignacion_turnoId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Asignacion_turnoId_idx" ON public."Asignacion" USING btree ("turnoId");


--
-- Name: CalendarioEscolar_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "CalendarioEscolar_activo_idx" ON public."CalendarioEscolar" USING btree (activo);


--
-- Name: CalendarioEscolar_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "CalendarioEscolar_deletedAt_idx" ON public."CalendarioEscolar" USING btree ("deletedAt");


--
-- Name: CalendarioEscolar_institucionId_fecha_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "CalendarioEscolar_institucionId_fecha_idx" ON public."CalendarioEscolar" USING btree ("institucionId", fecha);


--
-- Name: CalendarioEscolar_periodoOperativoId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "CalendarioEscolar_periodoOperativoId_idx" ON public."CalendarioEscolar" USING btree ("periodoOperativoId");


--
-- Name: ClaseProgramada_asignacionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ClaseProgramada_asignacionId_idx" ON public."ClaseProgramada" USING btree ("asignacionId");


--
-- Name: ClaseProgramada_comisionId_fecha_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ClaseProgramada_comisionId_fecha_idx" ON public."ClaseProgramada" USING btree ("comisionId", fecha);


--
-- Name: ClaseProgramada_fecha_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ClaseProgramada_fecha_idx" ON public."ClaseProgramada" USING btree (fecha);


--
-- Name: ClaseProgramada_institucionId_fecha_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ClaseProgramada_institucionId_fecha_idx" ON public."ClaseProgramada" USING btree ("institucionId", fecha);


--
-- Name: ClaseProgramada_moduloId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ClaseProgramada_moduloId_idx" ON public."ClaseProgramada" USING btree ("moduloId");


--
-- Name: CodigarioItem_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "CodigarioItem_activo_idx" ON public."CodigarioItem" USING btree (activo);


--
-- Name: CodigarioItem_codigarioId_codigo_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "CodigarioItem_codigarioId_codigo_key" ON public."CodigarioItem" USING btree ("codigarioId", codigo);


--
-- Name: CodigarioItem_codigarioId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "CodigarioItem_codigarioId_idx" ON public."CodigarioItem" USING btree ("codigarioId");


--
-- Name: CodigarioItem_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "CodigarioItem_deletedAt_idx" ON public."CodigarioItem" USING btree ("deletedAt");


--
-- Name: Codigario_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Codigario_deletedAt_idx" ON public."Codigario" USING btree ("deletedAt");


--
-- Name: Codigario_institucionId_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Codigario_institucionId_activo_idx" ON public."Codigario" USING btree ("institucionId", activo);


--
-- Name: Codigario_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Codigario_institucionId_idx" ON public."Codigario" USING btree ("institucionId");


--
-- Name: Codigario_institucionId_nombre_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Codigario_institucionId_nombre_key" ON public."Codigario" USING btree ("institucionId", nombre);


--
-- Name: Comision_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Comision_activo_idx" ON public."Comision" USING btree (activo);


--
-- Name: Comision_cursoId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Comision_cursoId_idx" ON public."Comision" USING btree ("cursoId");


--
-- Name: Comision_cursoId_nombre_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Comision_cursoId_nombre_key" ON public."Comision" USING btree ("cursoId", nombre);


--
-- Name: Comision_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Comision_deletedAt_idx" ON public."Comision" USING btree ("deletedAt");


--
-- Name: Comision_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Comision_institucionId_idx" ON public."Comision" USING btree ("institucionId");


--
-- Name: Comision_turnoId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Comision_turnoId_idx" ON public."Comision" USING btree ("turnoId");


--
-- Name: Comision_unidadId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Comision_unidadId_idx" ON public."Comision" USING btree ("unidadId");


--
-- Name: Curso_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Curso_activo_idx" ON public."Curso" USING btree (activo);


--
-- Name: Curso_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Curso_deletedAt_idx" ON public."Curso" USING btree ("deletedAt");


--
-- Name: Curso_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Curso_institucionId_idx" ON public."Curso" USING btree ("institucionId");


--
-- Name: Curso_institucionId_nombre_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Curso_institucionId_nombre_key" ON public."Curso" USING btree ("institucionId", nombre);


--
-- Name: DistribucionHoraria_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "DistribucionHoraria_activo_idx" ON public."DistribucionHoraria" USING btree (activo);


--
-- Name: DistribucionHoraria_asignacionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "DistribucionHoraria_asignacionId_idx" ON public."DistribucionHoraria" USING btree ("asignacionId");


--
-- Name: DistribucionHoraria_asignacionId_version_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "DistribucionHoraria_asignacionId_version_key" ON public."DistribucionHoraria" USING btree ("asignacionId", version);


--
-- Name: DistribucionHoraria_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "DistribucionHoraria_deletedAt_idx" ON public."DistribucionHoraria" USING btree ("deletedAt");


--
-- Name: DistribucionHoraria_estado_fecha_vigencia_desde_fecha_vigen_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "DistribucionHoraria_estado_fecha_vigencia_desde_fecha_vigen_idx" ON public."DistribucionHoraria" USING btree (estado, fecha_vigencia_desde, fecha_vigencia_hasta);


--
-- Name: DistribucionHoraria_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "DistribucionHoraria_institucionId_idx" ON public."DistribucionHoraria" USING btree ("institucionId");


--
-- Name: DistribucionModulo_moduloHorarioId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "DistribucionModulo_moduloHorarioId_idx" ON public."DistribucionModulo" USING btree ("moduloHorarioId");


--
-- Name: HorarioAsignado_distribucionHorariaId_moduloHorarioId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "HorarioAsignado_distribucionHorariaId_moduloHorarioId_key" ON public."HorarioAsignado" USING btree ("distribucionHorariaId", "moduloHorarioId");


--
-- Name: HorarioAsignado_institucionId_agenteId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "HorarioAsignado_institucionId_agenteId_idx" ON public."HorarioAsignado" USING btree ("institucionId", "agenteId");


--
-- Name: HorarioAsignado_institucionId_agenteId_moduloHorarioId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "HorarioAsignado_institucionId_agenteId_moduloHorarioId_idx" ON public."HorarioAsignado" USING btree ("institucionId", "agenteId", "moduloHorarioId");


--
-- Name: HorarioAsignado_institucionId_asignacionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "HorarioAsignado_institucionId_asignacionId_idx" ON public."HorarioAsignado" USING btree ("institucionId", "asignacionId");


--
-- Name: HorarioAsignado_institucionId_distribucionHorariaId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "HorarioAsignado_institucionId_distribucionHorariaId_idx" ON public."HorarioAsignado" USING btree ("institucionId", "distribucionHorariaId");


--
-- Name: HorarioAsignado_institucionId_moduloHorarioId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "HorarioAsignado_institucionId_moduloHorarioId_idx" ON public."HorarioAsignado" USING btree ("institucionId", "moduloHorarioId");


--
-- Name: Incidencia_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Incidencia_activo_idx" ON public."Incidencia" USING btree (activo);


--
-- Name: Incidencia_asignacionId_fecha_desde_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Incidencia_asignacionId_fecha_desde_idx" ON public."Incidencia" USING btree ("asignacionId", fecha_desde);


--
-- Name: Incidencia_asignacionId_fecha_desde_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Incidencia_asignacionId_fecha_desde_key" ON public."Incidencia" USING btree ("asignacionId", fecha_desde);


--
-- Name: Incidencia_asignacionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Incidencia_asignacionId_idx" ON public."Incidencia" USING btree ("asignacionId");


--
-- Name: Incidencia_codigarioItemId_fecha_desde_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Incidencia_codigarioItemId_fecha_desde_idx" ON public."Incidencia" USING btree ("codigarioItemId", fecha_desde);


--
-- Name: Incidencia_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Incidencia_deletedAt_idx" ON public."Incidencia" USING btree ("deletedAt");


--
-- Name: Incidencia_fecha_desde_fecha_hasta_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Incidencia_fecha_desde_fecha_hasta_idx" ON public."Incidencia" USING btree (fecha_desde, fecha_hasta);


--
-- Name: Institucion_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Institucion_activo_idx" ON public."Institucion" USING btree (activo);


--
-- Name: Institucion_cuit_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Institucion_cuit_idx" ON public."Institucion" USING btree (cuit);


--
-- Name: Institucion_cuit_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Institucion_cuit_key" ON public."Institucion" USING btree (cuit);


--
-- Name: Institucion_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Institucion_deletedAt_idx" ON public."Institucion" USING btree ("deletedAt");


--
-- Name: Institucion_dominio_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Institucion_dominio_key" ON public."Institucion" USING btree (dominio);


--
-- Name: Institucion_estado_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Institucion_estado_idx" ON public."Institucion" USING btree (estado);


--
-- Name: Materia_cursoId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Materia_cursoId_idx" ON public."Materia" USING btree ("cursoId");


--
-- Name: Materia_cursoId_nombre_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Materia_cursoId_nombre_key" ON public."Materia" USING btree ("cursoId", nombre);


--
-- Name: Materia_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Materia_institucionId_idx" ON public."Materia" USING btree ("institucionId");


--
-- Name: ModuloHorario_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ModuloHorario_activo_idx" ON public."ModuloHorario" USING btree (activo);


--
-- Name: ModuloHorario_dia_semana_hora_desde_hora_hasta_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ModuloHorario_dia_semana_hora_desde_hora_hasta_idx" ON public."ModuloHorario" USING btree (dia_semana, hora_desde, hora_hasta);


--
-- Name: ModuloHorario_institucionId_dia_semana_hora_desde_hora_hast_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "ModuloHorario_institucionId_dia_semana_hora_desde_hora_hast_key" ON public."ModuloHorario" USING btree ("institucionId", dia_semana, hora_desde, hora_hasta);


--
-- Name: ModuloHorario_institucionId_dia_semana_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ModuloHorario_institucionId_dia_semana_idx" ON public."ModuloHorario" USING btree ("institucionId", dia_semana);


--
-- Name: ModuloHorario_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ModuloHorario_institucionId_idx" ON public."ModuloHorario" USING btree ("institucionId");


--
-- Name: ModuloHorario_turnoId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ModuloHorario_turnoId_idx" ON public."ModuloHorario" USING btree ("turnoId");


--
-- Name: PeriodoOperativo_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PeriodoOperativo_deletedAt_idx" ON public."PeriodoOperativo" USING btree ("deletedAt");


--
-- Name: PeriodoOperativo_fecha_desde_fecha_hasta_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PeriodoOperativo_fecha_desde_fecha_hasta_idx" ON public."PeriodoOperativo" USING btree (fecha_desde, fecha_hasta);


--
-- Name: PeriodoOperativo_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PeriodoOperativo_institucionId_idx" ON public."PeriodoOperativo" USING btree ("institucionId");


--
-- Name: PeriodoOperativo_institucionId_nombre_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "PeriodoOperativo_institucionId_nombre_key" ON public."PeriodoOperativo" USING btree ("institucionId", nombre);


--
-- Name: PeriodoOperativo_institucionId_vigente_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PeriodoOperativo_institucionId_vigente_idx" ON public."PeriodoOperativo" USING btree ("institucionId", vigente);


--
-- Name: Reemplazo_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Reemplazo_activo_idx" ON public."Reemplazo" USING btree (activo);


--
-- Name: Reemplazo_agenteSuplenteId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Reemplazo_agenteSuplenteId_idx" ON public."Reemplazo" USING btree ("agenteSuplenteId");


--
-- Name: Reemplazo_asignacionTitularId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Reemplazo_asignacionTitularId_idx" ON public."Reemplazo" USING btree ("asignacionTitularId");


--
-- Name: Reemplazo_claseId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Reemplazo_claseId_idx" ON public."Reemplazo" USING btree ("claseId");


--
-- Name: Reemplazo_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Reemplazo_deletedAt_idx" ON public."Reemplazo" USING btree ("deletedAt");


--
-- Name: Sesion_expiresAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Sesion_expiresAt_idx" ON public."Sesion" USING btree ("expiresAt");


--
-- Name: Sesion_token_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Sesion_token_key" ON public."Sesion" USING btree (token);


--
-- Name: Sesion_usuarioId_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Sesion_usuarioId_institucionId_idx" ON public."Sesion" USING btree ("usuarioId", "institucionId");


--
-- Name: TitularAsignacion_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "TitularAsignacion_activo_idx" ON public."TitularAsignacion" USING btree (activo);


--
-- Name: TitularAsignacion_agenteId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "TitularAsignacion_agenteId_idx" ON public."TitularAsignacion" USING btree ("agenteId");


--
-- Name: TitularAsignacion_asignacionId_activo_fecha_hasta_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "TitularAsignacion_asignacionId_activo_fecha_hasta_idx" ON public."TitularAsignacion" USING btree ("asignacionId", activo, fecha_hasta);


--
-- Name: TitularAsignacion_asignacionId_fecha_desde_fecha_hasta_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "TitularAsignacion_asignacionId_fecha_desde_fecha_hasta_idx" ON public."TitularAsignacion" USING btree ("asignacionId", fecha_desde, fecha_hasta);


--
-- Name: TitularAsignacion_asignacionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "TitularAsignacion_asignacionId_idx" ON public."TitularAsignacion" USING btree ("asignacionId");


--
-- Name: TitularAsignacion_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "TitularAsignacion_deletedAt_idx" ON public."TitularAsignacion" USING btree ("deletedAt");


--
-- Name: TitularAsignacion_institucionId_agenteId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "TitularAsignacion_institucionId_agenteId_idx" ON public."TitularAsignacion" USING btree ("institucionId", "agenteId");


--
-- Name: TitularAsignacion_institucionId_asignacionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "TitularAsignacion_institucionId_asignacionId_idx" ON public."TitularAsignacion" USING btree ("institucionId", "asignacionId");


--
-- Name: TitularAsignacion_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "TitularAsignacion_institucionId_idx" ON public."TitularAsignacion" USING btree ("institucionId");


--
-- Name: Turno_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Turno_activo_idx" ON public."Turno" USING btree (activo);


--
-- Name: Turno_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Turno_deletedAt_idx" ON public."Turno" USING btree ("deletedAt");


--
-- Name: Turno_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Turno_institucionId_idx" ON public."Turno" USING btree ("institucionId");


--
-- Name: Turno_institucionId_nombre_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Turno_institucionId_nombre_key" ON public."Turno" USING btree ("institucionId", nombre);


--
-- Name: UnidadOrganizativa_activo_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "UnidadOrganizativa_activo_idx" ON public."UnidadOrganizativa" USING btree (activo);


--
-- Name: UnidadOrganizativa_deletedAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "UnidadOrganizativa_deletedAt_idx" ON public."UnidadOrganizativa" USING btree ("deletedAt");


--
-- Name: UnidadOrganizativa_institucionId_codigoUnidad_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "UnidadOrganizativa_institucionId_codigoUnidad_key" ON public."UnidadOrganizativa" USING btree ("institucionId", "codigoUnidad");


--
-- Name: UnidadOrganizativa_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "UnidadOrganizativa_institucionId_idx" ON public."UnidadOrganizativa" USING btree ("institucionId");


--
-- Name: UsuarioRol_institucionId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "UsuarioRol_institucionId_idx" ON public."UsuarioRol" USING btree ("institucionId");


--
-- Name: UsuarioRol_usuarioId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "UsuarioRol_usuarioId_idx" ON public."UsuarioRol" USING btree ("usuarioId");


--
-- Name: Usuario_email_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Usuario_email_key" ON public."Usuario" USING btree (email);


--
-- Name: Agente Agente_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Agente"
    ADD CONSTRAINT "Agente_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Asignacion Asignacion_comisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asignacion"
    ADD CONSTRAINT "Asignacion_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES public."Comision"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Asignacion Asignacion_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asignacion"
    ADD CONSTRAINT "Asignacion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Asignacion Asignacion_materiaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asignacion"
    ADD CONSTRAINT "Asignacion_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES public."Materia"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Asignacion Asignacion_turnoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asignacion"
    ADD CONSTRAINT "Asignacion_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES public."Turno"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Asignacion Asignacion_unidadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asignacion"
    ADD CONSTRAINT "Asignacion_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES public."UnidadOrganizativa"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CalendarioEscolar CalendarioEscolar_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CalendarioEscolar"
    ADD CONSTRAINT "CalendarioEscolar_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CalendarioEscolar CalendarioEscolar_periodoOperativoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CalendarioEscolar"
    ADD CONSTRAINT "CalendarioEscolar_periodoOperativoId_fkey" FOREIGN KEY ("periodoOperativoId") REFERENCES public."PeriodoOperativo"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClaseProgramada ClaseProgramada_asignacionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ClaseProgramada"
    ADD CONSTRAINT "ClaseProgramada_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES public."Asignacion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClaseProgramada ClaseProgramada_comisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ClaseProgramada"
    ADD CONSTRAINT "ClaseProgramada_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES public."Comision"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClaseProgramada ClaseProgramada_incidenciaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ClaseProgramada"
    ADD CONSTRAINT "ClaseProgramada_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES public."Incidencia"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClaseProgramada ClaseProgramada_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ClaseProgramada"
    ADD CONSTRAINT "ClaseProgramada_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClaseProgramada ClaseProgramada_moduloId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ClaseProgramada"
    ADD CONSTRAINT "ClaseProgramada_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES public."ModuloHorario"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClaseProgramada ClaseProgramada_unidadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ClaseProgramada"
    ADD CONSTRAINT "ClaseProgramada_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES public."UnidadOrganizativa"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CodigarioItem CodigarioItem_codigarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CodigarioItem"
    ADD CONSTRAINT "CodigarioItem_codigarioId_fkey" FOREIGN KEY ("codigarioId") REFERENCES public."Codigario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Codigario Codigario_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Codigario"
    ADD CONSTRAINT "Codigario_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comision Comision_cursoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Comision"
    ADD CONSTRAINT "Comision_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES public."Curso"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comision Comision_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Comision"
    ADD CONSTRAINT "Comision_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comision Comision_turnoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Comision"
    ADD CONSTRAINT "Comision_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES public."Turno"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comision Comision_unidadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Comision"
    ADD CONSTRAINT "Comision_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES public."UnidadOrganizativa"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Curso Curso_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Curso"
    ADD CONSTRAINT "Curso_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DistribucionHoraria DistribucionHoraria_asignacionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."DistribucionHoraria"
    ADD CONSTRAINT "DistribucionHoraria_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES public."Asignacion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DistribucionHoraria DistribucionHoraria_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."DistribucionHoraria"
    ADD CONSTRAINT "DistribucionHoraria_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DistribucionModulo DistribucionModulo_distribucionHorariaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."DistribucionModulo"
    ADD CONSTRAINT "DistribucionModulo_distribucionHorariaId_fkey" FOREIGN KEY ("distribucionHorariaId") REFERENCES public."DistribucionHoraria"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DistribucionModulo DistribucionModulo_moduloHorarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."DistribucionModulo"
    ADD CONSTRAINT "DistribucionModulo_moduloHorarioId_fkey" FOREIGN KEY ("moduloHorarioId") REFERENCES public."ModuloHorario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HorarioAsignado HorarioAsignado_agenteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."HorarioAsignado"
    ADD CONSTRAINT "HorarioAsignado_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES public."Agente"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HorarioAsignado HorarioAsignado_asignacionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."HorarioAsignado"
    ADD CONSTRAINT "HorarioAsignado_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES public."Asignacion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HorarioAsignado HorarioAsignado_distribucionHorariaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."HorarioAsignado"
    ADD CONSTRAINT "HorarioAsignado_distribucionHorariaId_fkey" FOREIGN KEY ("distribucionHorariaId") REFERENCES public."DistribucionHoraria"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HorarioAsignado HorarioAsignado_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."HorarioAsignado"
    ADD CONSTRAINT "HorarioAsignado_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HorarioAsignado HorarioAsignado_moduloHorarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."HorarioAsignado"
    ADD CONSTRAINT "HorarioAsignado_moduloHorarioId_fkey" FOREIGN KEY ("moduloHorarioId") REFERENCES public."ModuloHorario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Incidencia Incidencia_asignacionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Incidencia"
    ADD CONSTRAINT "Incidencia_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES public."Asignacion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Incidencia Incidencia_codigarioItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Incidencia"
    ADD CONSTRAINT "Incidencia_codigarioItemId_fkey" FOREIGN KEY ("codigarioItemId") REFERENCES public."CodigarioItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Incidencia Incidencia_incidenciaPadreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Incidencia"
    ADD CONSTRAINT "Incidencia_incidenciaPadreId_fkey" FOREIGN KEY ("incidenciaPadreId") REFERENCES public."Incidencia"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Materia Materia_cursoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Materia"
    ADD CONSTRAINT "Materia_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES public."Curso"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Materia Materia_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Materia"
    ADD CONSTRAINT "Materia_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ModuloHorario ModuloHorario_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ModuloHorario"
    ADD CONSTRAINT "ModuloHorario_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ModuloHorario ModuloHorario_turnoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ModuloHorario"
    ADD CONSTRAINT "ModuloHorario_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES public."Turno"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PeriodoOperativo PeriodoOperativo_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."PeriodoOperativo"
    ADD CONSTRAINT "PeriodoOperativo_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reemplazo Reemplazo_agenteSuplenteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Reemplazo"
    ADD CONSTRAINT "Reemplazo_agenteSuplenteId_fkey" FOREIGN KEY ("agenteSuplenteId") REFERENCES public."Agente"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reemplazo Reemplazo_asignacionTitularId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Reemplazo"
    ADD CONSTRAINT "Reemplazo_asignacionTitularId_fkey" FOREIGN KEY ("asignacionTitularId") REFERENCES public."Asignacion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reemplazo Reemplazo_claseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Reemplazo"
    ADD CONSTRAINT "Reemplazo_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES public."ClaseProgramada"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sesion Sesion_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Sesion"
    ADD CONSTRAINT "Sesion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sesion Sesion_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Sesion"
    ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TitularAsignacion TitularAsignacion_agenteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."TitularAsignacion"
    ADD CONSTRAINT "TitularAsignacion_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES public."Agente"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TitularAsignacion TitularAsignacion_asignacionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."TitularAsignacion"
    ADD CONSTRAINT "TitularAsignacion_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES public."Asignacion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TitularAsignacion TitularAsignacion_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."TitularAsignacion"
    ADD CONSTRAINT "TitularAsignacion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Turno Turno_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Turno"
    ADD CONSTRAINT "Turno_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UnidadOrganizativa UnidadOrganizativa_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UnidadOrganizativa"
    ADD CONSTRAINT "UnidadOrganizativa_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UsuarioRol UsuarioRol_institucionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UsuarioRol"
    ADD CONSTRAINT "UsuarioRol_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES public."Institucion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UsuarioRol UsuarioRol_rolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UsuarioRol"
    ADD CONSTRAINT "UsuarioRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES public."Rol"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UsuarioRol UsuarioRol_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UsuarioRol"
    ADD CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public."Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: admin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict rUaTnCcwckf5qcLzWYs7CZDJ6UceExonifw7Rqv4mtoWlwJyea9Kts4NLohtPoq

