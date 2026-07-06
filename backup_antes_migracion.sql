--
-- PostgreSQL database dump
--

\restrict dAAH9G6Icsagf429wntgFd7eS5rbfAEgt87jcDnumIGOpAaDK2u7wdH5aPQQe8g

-- Dumped from database version 18.4 (Ubuntu 18.4-0ubuntu0.26.04.1)
-- Dumped by pg_dump version 18.4 (Ubuntu 18.4-0ubuntu0.26.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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


ALTER SEQUENCE public."Agente_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Asignacion_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."CalendarioEscolar_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."ClaseProgramada_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."CodigarioItem_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Codigario_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Comision_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Curso_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."DistribucionHoraria_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."HorarioAsignado_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Incidencia_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Institucion_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Materia_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."ModuloHorario_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."PeriodoOperativo_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Reemplazo_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Rol_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Sesion_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."TitularAsignacion_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Turno_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."UnidadOrganizativa_id_seq" OWNER TO admin;

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


ALTER SEQUENCE public."Usuario_id_seq" OWNER TO admin;

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
1	1	Leandro	Alegre	31931828	leandroa.alegre@gmail.com	3413151474	3 de febrero 4579	ACTIVO	t	\N	2026-06-15 13:54:58.932	2026-06-15 13:54:58.932
2	1	Juan 	Perez	23232323	asda@asa.com	12345	sdsdf 13 	ACTIVO	t	\N	2026-06-15 19:57:47.929	2026-06-15 20:20:04.243
3	1	Jorge	Mengano	123455	leanasd@asdas.com	12345	asdasd 34556	ACTIVO	t	\N	2026-06-15 20:20:35.186	2026-06-21 22:01:34.46
\.


--
-- Data for Name: Asignacion; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Asignacion" (id, "institucionId", "unidadId", "identificadorEstructural", fecha_inicio, fecha_fin, estado, activo, "deletedAt", "createdAt", "updatedAt", "materiaId", "comisionId", "turnoId") FROM stdin;
1	1	5	111111	2026-01-01 00:00:00	\N	ACTIVO	t	\N	2026-06-15 19:51:17.217	2026-06-15 19:51:17.217	1	1	1
\.


--
-- Data for Name: CalendarioEscolar; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."CalendarioEscolar" (id, "institucionId", fecha, descripcion, "esFeriado", "suspendeClases", activo, "deletedAt", "createdAt", "updatedAt", "periodoOperativoId") FROM stdin;
2	1	2026-02-16 00:00:00	Carnaval	t	t	t	\N	2026-06-08 18:12:31.246	2026-06-08 18:13:18.868	1
3	1	2026-02-17 00:00:00	Carnabal	t	t	t	\N	2026-06-08 18:12:48.971	2026-06-08 18:13:25.094	1
4	1	2026-03-23 00:00:00	Dia no laborable	f	t	t	\N	2026-06-08 18:14:18.768	2026-06-08 18:14:18.768	1
5	1	2026-03-24 00:00:00	Dia de la memoria	t	t	t	\N	2026-06-08 18:14:48.253	2026-06-08 18:14:48.253	1
6	1	2026-04-02 00:00:00	Dia del veterano y los caidos en la guerra de malvinas	t	t	t	\N	2026-06-08 18:15:25.627	2026-06-08 18:15:25.627	1
7	1	2026-04-03 00:00:00	Viernres Santo	t	t	t	\N	2026-06-08 18:16:05.08	2026-06-08 18:16:05.08	1
8	1	2026-05-01 00:00:00	Dia del trabajador	t	t	t	\N	2026-06-08 18:16:29.387	2026-06-08 18:16:29.387	1
9	1	2026-05-25 00:00:00	Dia de la revolucion de mayo	t	t	t	\N	2026-06-08 18:16:52.603	2026-06-08 18:16:52.603	1
10	1	2026-06-17 00:00:00	Paso a la inmortalidad del Gral. Guemes	t	t	t	\N	2026-06-08 18:18:01.467	2026-06-08 18:18:01.467	1
11	1	2026-06-20 00:00:00	Paso a la inmortalidad del Gral Belgrano	t	t	t	\N	2026-06-08 18:18:49.3	2026-06-08 18:18:49.3	1
12	1	2026-07-09 00:00:00	Dia de la independencia	t	t	t	\N	2026-06-08 18:19:09.028	2026-06-08 18:19:09.028	1
13	1	2026-07-10 00:00:00	Dia no laborable	f	t	t	\N	2026-06-08 18:19:27.997	2026-06-08 18:19:27.997	1
14	1	2026-08-17 00:00:00	Paso a la inmortalidad del Gral. Jose de San Martin	t	t	t	\N	2026-06-08 18:20:11.694	2026-06-08 18:20:11.694	1
15	1	2026-10-12 00:00:00	Dia de la diversidad cultural	t	t	t	\N	2026-06-08 18:20:47.197	2026-06-08 18:20:47.197	1
16	1	2026-11-20 00:00:00	Dia de la soberania nacional	t	t	t	\N	2026-06-08 18:21:42.054	2026-06-08 18:21:42.054	1
17	1	2026-12-07 00:00:00	Dia no laborble	t	t	t	\N	2026-06-08 18:22:03.65	2026-06-08 18:22:03.65	1
18	1	2026-12-08 00:00:00	Dia de la virgen maria	t	t	t	\N	2026-06-08 18:22:32.843	2026-06-08 18:22:32.843	1
19	1	2026-12-25 00:00:00	Navidad	t	t	t	\N	2026-06-08 18:23:00.797	2026-06-08 18:23:00.797	1
1	1	2026-01-01 00:00:00	Año nuevo	t	t	t	\N	2026-06-08 18:12:00.978	2026-06-09 18:39:44.797	1
\.


--
-- Data for Name: ClaseProgramada; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ClaseProgramada" (id, "institucionId", "asignacionId", "moduloId", "unidadId", "comisionId", fecha, estado, "incidenciaId", "createdAt", "updatedAt") FROM stdin;
1	1	1	14	5	1	2026-06-02 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
2	1	1	24	5	1	2026-06-03 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
3	1	1	40	5	1	2026-06-05 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
4	1	1	14	5	1	2026-06-09 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
5	1	1	24	5	1	2026-06-10 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
6	1	1	40	5	1	2026-06-12 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
7	1	1	14	5	1	2026-06-16 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
8	1	1	24	5	1	2026-06-17 00:00:00	SUSPENDIDA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
9	1	1	40	5	1	2026-06-19 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
10	1	1	14	5	1	2026-06-23 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
11	1	1	24	5	1	2026-06-24 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
12	1	1	40	5	1	2026-06-26 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
13	1	1	14	5	1	2026-06-30 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
14	1	1	24	5	1	2026-07-01 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
18	1	1	40	5	1	2026-07-10 00:00:00	SUSPENDIDA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
19	1	1	14	5	1	2026-07-14 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
20	1	1	24	5	1	2026-07-15 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
21	1	1	40	5	1	2026-07-17 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
22	1	1	14	5	1	2026-07-21 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
23	1	1	24	5	1	2026-07-22 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
24	1	1	40	5	1	2026-07-24 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
25	1	1	14	5	1	2026-07-28 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
26	1	1	24	5	1	2026-07-29 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
27	1	1	40	5	1	2026-07-31 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
28	1	1	14	5	1	2026-08-04 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
29	1	1	24	5	1	2026-08-05 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
30	1	1	40	5	1	2026-08-07 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
34	1	1	14	5	1	2026-08-18 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
35	1	1	24	5	1	2026-08-19 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
36	1	1	40	5	1	2026-08-21 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
37	1	1	14	5	1	2026-08-25 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
38	1	1	24	5	1	2026-08-26 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
39	1	1	40	5	1	2026-08-28 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
40	1	1	14	5	1	2026-09-01 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
41	1	1	24	5	1	2026-09-02 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
42	1	1	40	5	1	2026-09-04 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
43	1	1	14	5	1	2026-09-08 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
44	1	1	24	5	1	2026-09-09 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
45	1	1	40	5	1	2026-09-11 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
46	1	1	14	5	1	2026-09-15 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
47	1	1	24	5	1	2026-09-16 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
48	1	1	40	5	1	2026-09-18 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
49	1	1	14	5	1	2026-09-22 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
50	1	1	24	5	1	2026-09-23 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
51	1	1	40	5	1	2026-09-25 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
52	1	1	14	5	1	2026-09-29 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
53	1	1	24	5	1	2026-09-30 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
54	1	1	40	5	1	2026-10-02 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
55	1	1	14	5	1	2026-10-06 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
56	1	1	24	5	1	2026-10-07 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
57	1	1	40	5	1	2026-10-09 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
58	1	1	14	5	1	2026-10-13 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
59	1	1	24	5	1	2026-10-14 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
60	1	1	40	5	1	2026-10-16 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
61	1	1	14	5	1	2026-10-20 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
62	1	1	24	5	1	2026-10-21 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
63	1	1	40	5	1	2026-10-23 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
64	1	1	14	5	1	2026-10-27 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
65	1	1	24	5	1	2026-10-28 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
66	1	1	40	5	1	2026-10-30 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
75	1	1	40	5	1	2026-11-20 00:00:00	SUSPENDIDA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
79	1	1	14	5	1	2026-12-01 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
80	1	1	24	5	1	2026-12-02 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
81	1	1	40	5	1	2026-12-04 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
82	1	1	14	5	1	2026-12-08 00:00:00	SUSPENDIDA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
83	1	1	24	5	1	2026-12-09 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
84	1	1	40	5	1	2026-12-11 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
85	1	1	14	5	1	2026-12-15 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
86	1	1	24	5	1	2026-12-16 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
87	1	1	40	5	1	2026-12-18 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
88	1	1	14	5	1	2026-12-22 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
17	1	1	24	5	1	2026-07-08 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-15 20:17:31.281
32	1	1	24	5	1	2026-08-12 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-15 21:18:17.524
33	1	1	40	5	1	2026-08-14 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-15 20:35:02.082
72	1	1	40	5	1	2026-11-13 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.526
71	1	1	24	5	1	2026-11-11 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.532
69	1	1	40	5	1	2026-11-06 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.542
73	1	1	14	5	1	2026-11-17 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.604
74	1	1	24	5	1	2026-11-18 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:16:12.383
76	1	1	14	5	1	2026-11-24 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.606
77	1	1	24	5	1	2026-11-25 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.609
78	1	1	40	5	1	2026-11-27 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.61
15	1	1	40	5	1	2026-07-03 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-07-02 21:39:06.448
89	1	1	24	5	1	2026-12-23 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
90	1	1	40	5	1	2026-12-25 00:00:00	SUSPENDIDA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
91	1	1	14	5	1	2026-12-29 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
92	1	1	24	5	1	2026-12-30 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 19:52:24.687
16	1	1	14	5	1	2026-07-07 00:00:00	PROGRAMADA	\N	2026-06-15 19:52:24.687	2026-06-15 20:32:00.749
31	1	1	14	5	1	2026-08-11 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-15 20:35:02.083
70	1	1	14	5	1	2026-11-10 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.532
67	1	1	14	5	1	2026-11-03 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.534
68	1	1	24	5	1	2026-11-04 00:00:00	REEMPLAZADA	\N	2026-06-15 19:52:24.687	2026-06-17 19:14:56.537
\.


--
-- Data for Name: Codigario; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Codigario" (id, "institucionId", nombre, descripcion, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	CODIGARIO DOCENTE	Articulado docente	t	\N	2026-06-08 18:23:34.246	2026-06-08 18:23:34.246
2	1	CODIGARIO ASISTENTES ESCOLARES	Articulado asistentes escolares	t	\N	2026-06-08 18:24:08.586	2026-06-12 23:04:54.972
3	1	CODIGARIO NO DOCENTE	Articulado no docente	f	2026-06-12 23:05:33.425	2026-06-09 19:13:48.225	2026-06-12 23:05:33.426
\.


--
-- Data for Name: CodigarioItem; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."CodigarioItem" (id, "codigarioId", codigo, nombre, descripcion, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
4	1	7.0	ENFERMEDAD LARGA DURACIÓN	Titulares e interinos sin antigüedad Reemplazantes con 60 días de antigüedad / Max 2 años / Corridos / SI	t	\N	2026-06-08 18:37:54.823	2026-06-08 18:37:54.823
2	1	5.a	ENFERMEDAD CORTA DURACIÓN	Titulares e interinos sin antigüedad Reemplazantes con 60 días de antigüedad / Máximo 45 días / Corridos / Si	t	\N	2026-06-08 18:35:33.982	2026-06-08 22:43:46.395
3	1	5.b	ENFERMEDAD CORTA DURACION - Agotado el 5a	Titulares e interinos sin antigüedad Reemplazantes con 60 días de antigüedad / Sin límite / Corridos / Si 	t	\N	2026-06-08 18:36:45.012	2026-06-08 22:43:56.987
5	1	7.1	ENFERMEDAD A LA ESPERA DE JUNTA MEDICA MINISTERIAL	C/S S Titulares e interinos sin antigüedad Reemplazantes con 60 días de antigüedad Acumula en cod. 7º 0 Corridos SI 	t	\N	2026-06-08 22:46:56.246	2026-06-08 22:46:56.246
6	1	7.1a	ENFERMEDAD A LA ESPERA JTA. MED. MINISTERIAL COMO CONSEC. DE ACC. DE TRAB. PREVENTIVA SIN AGOTAR 2 AÑOS	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula7º0 (por rechaz) u 8ºa (por calificación) Corridos SI 	t	\N	2026-06-08 22:47:41.664	2026-06-08 22:47:41.664
7	1	7.1b	ENFERMEDAD A LA ESPERA JUNTA MÉDICA MINISTER. COMO CONSEC. DE ENFERMEDAD PROFESIONAL PREVENTIVA SIN AGOTAR 2 AÑOS	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula7º0 (por rechaz) u 8ºb (por calificación) Corridos SI	t	\N	2026-06-08 22:48:14.521	2026-06-08 22:48:14.521
8	1	7.2	ENFERMEDAD A LA ESPERA JUNTA MEDICA DE LA CAJA DE JUBILAC. Y PENSIONES	C/S S Titulares e interinos sin antigüedad Reemplazantes con 60 días de antigüedad Acumula en cod. 7º 0 Corridos SI	t	\N	2026-06-08 22:49:05.793	2026-06-08 22:49:05.793
9	1	7.2a	ENFERMEDAD A LA ESPERA JUNTA MED. CAJA DE JUB. Y PENS. COMO CONSECECUENC. ACC. DE TRABAJO PREVENT. SIN AGOTAR 2 AÑOS	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula7º0 (por rechaz.) u 8º a (por calificación) Corridos SI	t	\N	2026-06-08 22:49:38.375	2026-06-08 22:49:38.375
10	1	7.2b	ENFERMEDAD A LA ESPERA JUNTA MED. DE LA CAJA DE JUB. Y PENS. COMO CONSEC. ENF. PROFESIONAL PREVENT. SIN AGOTAR 2 AÑOS	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula7º0 (por rechaz.) u 8º b (por calificación) Corridos SI	t	\N	2026-06-08 22:50:15.302	2026-06-08 22:50:15.302
11	1	7.4	ENFERMEDAD A LA ESP NOR. LEGAL QUE RESUELVA ADM. SIT. LABORAL POR FALTA DE APT. PSICOFISICA.	C/S S Titulares e interinos sin antigüedad Reemplazantes con 60 días de antigüedad Acumula en cod. 7º 0 Corridos SI	t	\N	2026-06-08 22:50:42.688	2026-06-08 22:50:42.688
12	1	7.5	ENERMEDAD A LA ESPERA DICTADO NORMA LEGAL CESE POR INCAPAC. TOTAL Y PERMANENTE	C/S S Titulares e interinos sin antigüedad Reemplazantes con 60 días de antigüedad Acumula en cod. 7º 0 Corridos SI	t	\N	2026-06-08 22:51:08.784	2026-06-08 22:51:08.784
13	1	7.6	ACCIDENTE DE TRABAJO PROVISORIO	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula7º0 (por rechaz) u 8ºa (por calificación) Corridos SI 	t	\N	2026-06-08 22:51:32.39	2026-06-08 22:51:32.39
14	1	7.7	ENFERMEDAD PROFESIONAL PROVISORIA	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula7º0 (por rechaz) u 8ºb (por calificación) Corridos SI	t	\N	2026-06-08 22:52:05.384	2026-06-08 22:52:05.384
15	1	7.8	ENFERMEDAD DE GRAVEDAD EXTREMA O TERMINAL	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula7º0 (por rechaz) u 8ºa/b(por calificación) Corridos SI	t	\N	2026-06-08 22:52:26.575	2026-06-08 22:52:26.575
16	1	8.a	ACCIDENTE DE TRABAJO (CALIFICADO)	C/S S Titulares, interinos y reemplazantes sin antigüedad 2 años Corridos SI	t	\N	2026-06-08 22:52:50.283	2026-06-08 22:52:50.283
17	1	8.b	ENFERMEDAD PROFESIONAL (CALIFICADA)	C/S S Titulares, interinos y reemplazantes sin antigüedad 2 años Corridos SI	t	\N	2026-06-08 22:53:13.117	2026-06-08 22:53:13.117
18	1	8.1a	ENFERMEDAD A LA ESPERA JUNTA MÉDICA MINISTERIAL COMO CONSECUENCIA ACC. DE TRABAJO SIN AGOTAR 2 AÑOS	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula al cod. 8º a por cada accidente Corridos SI 	t	\N	2026-06-08 22:53:36.74	2026-06-08 22:53:36.74
19	1	8.1b	ENFERMEDAD A LA ESPERA JUNTA MEDICA MINISTERIAL COMO CONSEC. ENFERMEDAD PROFESIONAL SIN AGOTAR 2 AÑOS	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula al cod. 8º b por cada enfermedad profesional Corridos SI	t	\N	2026-06-08 22:53:57.187	2026-06-08 22:53:57.187
20	1	8.2a	ENFERMEDAD A LA ESPERA JUNTA MÉDICA CAJA JUB. COMO CONSEC. ACC. TRABAJO SIN AGOTAR 2 AÑOS	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula al cod. 8º a por cada accidente Corridos SI	t	\N	2026-06-08 22:54:24.355	2026-06-08 22:54:24.355
21	1	8.2b	ENFERMEDAD A LA ESPERA JUNTA MEDICA CAJA JUBILAC. COMO CONSEC. ENFERMEDAD PROFESIONAL SIN AGOTAR 2 AÑOS	C/S S Titulares, interinos y reemplazantes sin antigüedad Acumula al cod. 8º b por cada enfermedad profesional Corridos SI	t	\N	2026-06-08 22:54:44.786	2026-06-08 22:54:44.786
22	1	11.1	TAREAS DIFERENTES TRANSITORIA	C/S S Titular con 1 año de antigüedad docente, debidamente reconocida. 2 años Corridos SI	t	\N	2026-06-08 22:55:11.421	2026-06-08 22:55:11.421
23	1	11.2	TAREAS DIFERENTES DEFINITIVAS	C/S S Titular con 1 año de antigüedad docente, debidamente reconocida. Sin límite Corridos SI	t	\N	2026-06-08 22:55:31.672	2026-06-08 22:55:31.672
24	1	15.a	PRE-PARTO 	C/S SD Titulares e interinos sin antigüedad, Reemplazantes con 60 días Comienza máx.45 / mín.30 días antes de la fecha probable de parto Corridos sin interrupción SI	t	\N	2026-06-08 22:56:00.148	2026-06-08 22:56:00.148
25	1	15.b	MATERNIDAD (CON NIÑO/S VIVO/S)	C/S SD Titulares e interinos sin antigüedad, Reemplazantes con 60 días Completa 135 días de Licencia, sumada la utilizada por 15a Corridos sin interrupción SI	t	\N	2026-06-08 22:56:39.132	2026-06-08 22:56:39.132
26	1	15.c	PARTO SIN NIÑO/S VIVO/S	C/S SD Titulares e interinos sin antigüedad, Reemplazantes con 60 días 45 días Corridos SI	t	\N	2026-06-08 22:57:13.113	2026-06-08 22:57:13.113
27	1	15.d	FALLECIMIENTO NIÑO/S DURANTE LIC. POR MATERNIDAD	C/S SD Titulares e interinos sin antigüedad, Reemplazantes con 60 días Máximo 15 días, no menos de 5 días Corridos SI	t	\N	2026-06-08 22:57:42.318	2026-06-08 22:57:42.318
28	1	15.e	PARTO PREMATURO 	C/S SD Titulares e interinos sin antigüedad, Reemplazantes con 60 días 105 días Corridos SI	t	\N	2026-06-08 22:58:09.832	2026-06-08 22:58:09.832
29	1	16.a	ADOPCION DE NIÑOS HASTA 7 AÑOS DE EDAD	C/S R Titulares e interinos sin antigüedad, Reemplazantes con 60 días 75 Días Corridos SI	t	\N	2026-06-08 22:58:32.648	2026-06-08 22:58:32.648
30	1	16.b	ADOPCION DE NIÑOS ENTRE 7 Y 12 AÑOS DE EDAD	C/S R Titulares e interinos sin antigüedad, Reemplazantes con 60 días. 60 días Corridos SI	t	\N	2026-06-08 22:59:00.662	2026-06-08 22:59:00.662
31	1	18.a	AMAMANTAMIENTO	C/S D Titulares e interinas sin antigüedad, Reemplazantes con 60 días. Cargo mayor de 25 hs que cumplan más de 4 horas reloj por jornada trabajo. Incluidas las Maestras Jardineras. 1 hora por día hasta el año de vida del bebé. 1 hora y ½ en el caso de nacimiento múltiple. Corridos No para cargos, sí para horas	t	\N	2026-06-08 22:59:22.42	2026-06-08 22:59:22.42
32	1	18.b	AMAMANTAMIENTO POR PRESCRIPCIÓN MÉDICA	C/S SD Titulares e interinas sin antigüedad, Reemplazantes con 60 días. Cargos mayor de 25 hs. que cumplan más de 4 horas reloj por jornada de trabajo. Incluidas las Maestras Jardineras. Hasta 1 hora por día. Hasta 1h. y ½ en el caso de nacimiento múltiple. Se otorga vencido el plazo máximo de 18° a y por Junta Médica Corridos No para cargos, sí para horas	t	\N	2026-06-08 22:59:50.897	2026-06-08 22:59:50.897
33	1	19.a	ENFERMEDAD EN EL EXTRANJERO 	C/S S Titulares e interinos sin antigüedad 6 meses Corridos SI	t	\N	2026-06-08 23:00:18.853	2026-06-08 23:00:18.853
34	1	19.b	ENFERMEDAD EN EL EXTRANJERO	S/S S Titulares e interinos sin antigüedad 6 meses Corridos SI	t	\N	2026-06-08 23:00:53.319	2026-06-08 23:00:53.319
35	1	21.1	MATRIMONIO DEL AGENTE	C/S D Titulares e interinos sin antigüedad. Reemplazantes con 60 días. 15 días Corridos SI	t	\N	2026-06-08 23:01:17.563	2026-06-08 23:01:17.563
36	1	21.2a	NACIMIENTO DE HIJO DE AGENTE VARON	C/S D Titulares e interinos sin antigüedad. Reemplazantes con 60 días. 2 días por vez Hábiles SI	t	\N	2026-06-08 23:02:02.918	2026-06-08 23:02:02.918
37	1	21.2b	MATRIMONIO DE HIJO	C/S D Titulares e interinos sin antigüedad. Reemplazantes con 60 días. 2 días por vez Hábiles SI	t	\N	2026-06-08 23:02:31.367	2026-06-08 23:02:31.367
38	1	21.3a	DUELO POR PADRES, HIJOS O CONYUGE	C/S D Titulares, interinos y reemplazantes sin antigüedad 5 días por vez Hábiles SI	t	\N	2026-06-08 23:02:58.644	2026-06-08 23:02:58.644
39	1	21.3b	DUELO POR HERMANO	C/S D Titulares interinos y reemplazantes sin antigüedad 3 días por vez Hábiles SI 	t	\N	2026-06-08 23:03:51.442	2026-06-08 23:03:51.442
40	1	21.3c	DUELO (PADRES, HIJOS Y HNOS. POLITICOS, ABUELOS Y NIETOS DIRECTOS O POLÍTICOS)	C/S D Titulares interinos y reemplazantes sin antigüedad 2 días por vez Hábiles SI	t	\N	2026-06-08 23:04:18.908	2026-06-08 23:04:18.908
41	1	21.3d	DUELO (TÍO, SOBRINO Y PRIMO DIRECTO O POLÍTICO) 	C/S D Titulares interinos y reemplazantes sin antigüedad 2 días por vez Hábiles S	t	\N	2026-06-08 23:04:54.429	2026-06-08 23:04:54.429
42	1	21.4a	ATENCIÓN DE FAMILIAR ENFERMO	C/S SD Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Máximo 15 días Corridos SI	t	\N	2026-06-08 23:05:26.7	2026-06-08 23:05:26.7
43	1	21.4b	ATENCIÓN DE FAMILIAR ENFERMO	C/S S Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Máximo 30 más Corridos SI	t	\N	2026-06-08 23:05:48.53	2026-06-08 23:05:48.53
44	1	21.4c	ATENCIÓN DE FAMILIAR ENFERMO	C/S S Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Máximo 1 Año Acumula en 21.4.a y b Corridos SI	t	\N	2026-06-08 23:06:22.267	2026-06-08 23:06:22.267
45	1	21.4d	ATENCIÓN DE FAMILIAR ENFERMO	S/S S Titulares e interinos sin antigüedad. Reemplazantes con 60 días. 30 días a 1 año Acumula en 21.4.a.b.c Corridos SI	t	\N	2026-06-08 23:06:53.6	2026-06-08 23:06:53.6
46	1	21.4e	ATENCIÓN FAMILIAR ENFERMO MENOR DISCAPACITADO	C/S S Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Max 1 año Corridos SI	t	\N	2026-06-08 23:07:15.899	2026-06-08 23:07:15.899
47	1	23.1a	CAUSA IMPREVISTA (SIN REEMPLAZANTE)	C/S D Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Max 1 día Max 4 días Hábiles NO	t	\N	2026-06-08 23:07:43.107	2026-06-08 23:07:43.107
48	1	23.1a1	CAUSA IMPREVISTA (CON REEMPLAZANTE)	S/S D Titulares e interinos sin antigüedad. Reemplazantes con 60 días.Max 1 día Max 4 días Hábiles NO	t	\N	2026-06-08 23:09:03.616	2026-06-08 23:09:03.616
49	1	23.1b	CAUSA IMPREVISTA	S/S D Titulares e interinos sin antigüedad. Máx.15 días continuos o discont. Hábiles SI 	t	\N	2026-06-08 23:09:36.253	2026-06-08 23:09:36.253
50	1	23.2	FUERZA MAYOR (generado por el hombre: Ej. corte de ruta) o CASO FORTUITO (por la Naturaleza: Ej. Terrem.; Rotura de un puente, inund.)	C/S D Titulares e interinos sin antigüedad. Sin límite Hábiles SI	t	\N	2026-06-08 23:10:01.555	2026-06-08 23:10:01.555
51	1	23.3	FENÓMENO METEOROLÓGICO (Ej. Anegamiento por lluvia intensa)	C/S D Titulares e interinos sin antigüedad. Sin límite Hábiles SI 	t	\N	2026-06-08 23:10:26.691	2026-06-08 23:10:26.691
52	1	23.4	DONACION DE SANGRE	C/S D Titulares e interinos sin antigüedad. Sin límite Hábiles SI 	t	\N	2026-06-08 23:11:00.138	2026-06-08 23:11:00.138
53	1	24.0	ASUNTOS PARTICULARES	S/S R Titulares solamente, con 5 años de antigüedad inmediata anterior en el cargo. Solicitar mín. 15 días antes.- Esta licencia no se otorga si su vencimiento es dentro de los 5 días hábiles previos al receso de invierno. 6 meses Corridos Si	t	\N	2026-06-08 23:11:26.495	2026-06-08 23:11:26.495
54	1	25.0	ACOMPAÑAR AL CONYUGE EN MISIÓN OFICIAL	S/S R Titulares e interinos sin antigüedad En misión oficial a más de 100 km de distancia y no menos de 60 días de duración de la misión. Corridos Si	t	\N	2026-06-08 23:11:49.285	2026-06-08 23:11:49.285
55	1	26.a	RENDIR EXÁMENES UNIVERSITARIOS O TERCIARIOS	C/S D Titulares e interinos sin antigüedad. Reemplazantes con 60 días. 7dias por examen.- Máximo: 21 días Hábiles SI 	t	\N	2026-06-08 23:12:09.057	2026-06-08 23:12:09.057
56	1	26.b	RENDIR EXAMEN NIVEL MEDIO O EN CARRERA DE AUXILIARES EN MEDICINA	C/S D Titulares e interinos sin antigüedad. Reemplazantes con 60 días. 7 días 2 veces p/ año. Max 14 días Hábiles SI	t	\N	2026-06-08 23:12:30.124	2026-06-08 23:12:30.124
57	1	26.c	RENDIR EXAMEN DE CURSOS QUE IMPLIQUEN ELEVAMIENTO CULTURAL	C/S D Titulares e interinos sin antigüedad. Reemplazantes con 60 días. 3 días 2 veces por año-Max. 6 Hábiles SI	t	\N	2026-06-08 23:12:50.564	2026-06-08 23:12:50.564
58	1	27.a	CURSOS OBLIGATORIOS PARA CONCURSOS DE ASCENSO EN LA DOCENCIA	C/S R Titulares e interinos sin antigüedad. Durante el tiempo de asistencia Corridos SI 	t	\N	2026-06-08 23:13:12.848	2026-06-08 23:13:12.848
59	1	27.b	CURSOS DE PERFECCIONAMIENTO DOCENTE DETERMINADOS POR MIN. DE EDUC	C/S R Titulares e interinos sin antigüedad. Durante el tiempo de asistencia Corridos SI	t	\N	2026-06-08 23:13:37.403	2026-06-08 23:13:37.403
60	1	28.0	DESIGNACIÓN TRANSITORIA Y NO RETRIBUIDA MIEMBRO DE TRIBUNAL O JURADO	C/S D Titulares e interinos sin antigüedad. Por el tiempo que demande la función. Corridos SI	t	\N	2026-06-08 23:13:58.673	2026-06-08 23:13:58.673
61	1	29.0	ACTIVIDAD DE INTERES ESCOLAR – NO COMPUTAR INASISTENCIA	C/S R Titulares, interinos y reemplazantes sin antigüedad. Por el tiempo que fije la autoridad competente. Corridos SI/NO Seg.Norm	t	\N	2026-06-08 23:14:21.585	2026-06-08 23:14:21.585
62	1	30.0	ACTIVIDADES ESCOLARES SIMULTANEAS	C/S D Titulares, interinos y reemplazantes sin antigüedad. Máx. 1 día por establecimiento. Hábiles NO, pero si el cargo es frente a alumnos SI	t	\N	2026-06-08 23:14:47.441	2026-06-08 23:14:47.441
63	1	31.0	INTEGRACION DE MESAS EXAMINADORAS	C/S D Titulares e interinos sin antigüedad. Debe existir superposición horaria con sus tareas habituales. Máximo 18 días Hábiles NO, pero si el cargo es frente a alumnos SI	t	\N	2026-06-08 23:15:11.157	2026-06-08 23:15:11.157
64	1	32.0	ESTUDIO DE ESPECIALIZACION O BECAS(ver observaciones apartado 2)	S/S R Titulares, interinos y reemplazantes con dos (2) años de antigüedad ininterrumpida inmediatamente anterior en el cargo 1 año, prorrogable 1 año más Máximo 2 años Corridos SI	t	\N	2026-06-08 23:15:30.264	2026-06-08 23:15:30.264
65	1	33.0	ESTUDIOS EN EL PAIS O EXTRANJERO DE INTERÉS ESCOLAR (ver observaciones apartado 2)	C/S R Titulares, interinos y reemplazantes con tres (3) años de antigüedad ininterrumpida inmediatamente anterior en el cargo/horas Sin límite Corridos SI 	t	\N	2026-06-08 23:15:56.129	2026-06-08 23:15:56.129
66	1	34.0	CURSOS EN LA ESCUELA DE DEFENSA NACIONAL (ver apartado 2)	CURSOS EN LA ESCUELA DE DEFENSA NACIONAL (ver apartado 2)	t	\N	2026-06-08 23:16:14.016	2026-06-08 23:16:14.016
67	1	35.1	 INTERVENIR EN CAMPEONATOS DEPORTIVOS SELECTIVOS REGIONALES Y/O CAMPEONATOS ARGENTINOS NO RENTADOS	C/S R Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Max. 60 días Corridos SI	t	\N	2026-06-08 23:16:47.669	2026-06-08 23:16:47.669
68	1	35.2	DIRIGENTE O REPRESENTANTE DE DELEGACIONES DEPORTIVAS PREVISTAS EN EL INCISO 1	C/S R Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Max. 30 Corridos Si	t	\N	2026-06-08 23:17:10.778	2026-06-08 23:17:10.778
69	1	35.3	CONGRESOS, ASAMBLEAS, REUNIONES, CURSOS DE ACTIVIDADES DEPORTIVAS EN EL PAÍS O EN EL EXTRANJERO	C/S R Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Max 30 días Corridos SI	t	\N	2026-06-08 23:17:37.009	2026-06-08 23:17:37.009
70	1	35.4	JUEZ, ÁRBITRO O JURADO POR LAS FEDERACIONES EN ORGANIZACIONES NAC. O INTERNACIONALES P/COMPETENCIAS DEL INCISO 1	C/S R Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Max 30 días Corridos SI	t	\N	2026-06-08 23:17:58.908	2026-06-08 23:17:58.908
71	1	35.5	DIRECTOR TECNICO O ENTRENADOR EN CAMPEONATOS PREVISTOS EN INCISO 1	C/S R Titulares e interinos sin antigüedad. Reemplazantes con 60 días. Max. 30 días Corridos SI	t	\N	2026-06-08 23:18:28.047	2026-06-08 23:18:28.047
72	1	36.0	CONDUCCION DE GRUPOS.- PARTICIPACION EN TAREAS ESPEC.- ACOMPAÑAR DELEGACIONES ESC.- (TORNEO, ENCUENTRO, EXCURCIÓN, CAMPAMENTO)	C/S R Titulares interinos y reemplazantes sin antigüedad. Solicitar como mínimo 15 días antes.- Sin límite Corridos SI	t	\N	2026-06-08 23:19:02.925	2026-06-08 23:19:02.925
73	1	38.1	RENDIR PRUEBAS DE OPOSICIÓN P/INGRESO O ASCENSO DOCENTE	C/S D Titulares, interinos y reemplazantes sin antigüedad 2 días hábiles por vez Hábiles SI 	t	\N	2026-06-08 23:19:21.474	2026-06-08 23:19:21.474
74	1	38.2	CONVOCATORIA PARA OFRECIMIENTO DE CARGO	C/S D Titulares, interinos y reemplazantes sin antigüedad 2 días hábiles por vez Hábiles SI	t	\N	2026-06-08 23:19:39.897	2026-06-08 23:19:39.897
75	1	38.3	CARPETA MEDICA (INICIAR O COMPLETAR)	C/S D Titulares, interinos y reemplazantes sin antigüedad Por el tiempo que demande el trámite Hábiles si	t	\N	2026-06-08 23:19:58.91	2026-06-08 23:19:58.91
76	1	38.4	CAMBIO DE DOMICILIO (MUDANZA ORIGINADA UNICAMENTE POR TRASLADO O TOMA DE CARGO)	C/S D Titulares e interinos sin antigüedad 3 días corridos por vez Hábiles SI	t	\N	2026-06-08 23:20:19.158	2026-06-08 23:20:19.158
77	1	38.5	REVISACIÓN MÉDICA INCORPORACIÓN A LAS FF.AA.	C/S D Titulares, interinos y reemplazantes sin antigüedad Sin límite Hábiles SI	t	\N	2026-06-08 23:20:43.951	2026-06-08 23:20:43.951
78	1	40.a	REINCORPORACIÓN TRANSITORIA A LAS FUERZAS ARMADAS O DE SEGURIDAD	S/S D Titulares, interinos y reemplazantes sin antigüedad Sin límite Corridos SI	t	\N	2026-06-08 23:21:34.355	2026-06-08 23:21:34.355
79	1	40.b	LIC. POSTERIOR A LA BAJA DE LA REINCORPORAC DEL AGENTE A LAS FUERZAS ARMADAS (Máx.10 días)	C/S D Titulares, interinos y reemplazantes sin antigüedad Hasta 10 días después de la fecha de baja. Corridos SI	t	\N	2026-06-08 23:21:58.006	2026-06-08 23:21:58.006
80	1	40.c	LIC. POSTERIOR A LA BAJA DE LA REINCORPORAC DEL AGENTE A LAS FUERZAS ARMADAS (Máx. 30 días)	S/S D Titulares, interinos y reemplazantes sin antigüedad Hasta 30 días más a los utilizados por 40º b. Corridos SI 	t	\N	2026-06-08 23:22:28.596	2026-06-08 23:22:28.596
81	1	41.a	DESIGN EN CARGOS O COMI SIONES DE CARÁCTER TRANSITORIO	S/S R Titulares e interinos sin antigüedad. Por el tiempo que permanezca en la función. Corridos SI 	t	\N	2026-06-08 23:22:48.229	2026-06-08 23:22:48.229
82	1	41.b	ELECTO EN CARGOS PUBLICOS DE CONDUCCIÓN POLÍTICA	S/S R Titulares e interinos sin antigüedad. Por el tiempo que permanezca en la función. Corridos SI	t	\N	2026-06-08 23:23:08.847	2026-06-08 23:23:08.847
83	1	41.ba	ASCENSO EN CARGOS DIRECTIVOS O DE SUPERVISIÓN TRANSITORIOS EN EL SISTEMA EDUCATIVO PROV	S/S R Titulares e interinos sin antigüedad. Por el tiempo que permanezca en la función. Corridos SI 	t	\N	2026-06-08 23:23:37.624	2026-06-08 23:23:37.624
84	1	41.bb	OTRAS DESIGNACIONES TRANSITORIAS QUE SIGNIFIQUEN ASCENSOS EN LA CARRERA DOC. NO INCLUIDOS EN EL 41 b a	S/S R Titulares e interinos sin antigüedad. Por el tiempo que permanezca en la función. Corridos SI 	t	\N	2026-06-08 23:24:00.309	2026-06-08 23:24:00.309
85	1	42.a	INTEGRACION DE COMISIÓN GREMIAL CON SUELDO	C/S R Titulares e interinos sin antigüedad.- Integrantes de Comisiones Directivas.- Por el tiempo que permanezca en la función efectiva. Corridos SI	t	\N	2026-06-08 23:24:23.816	2026-06-08 23:24:23.816
86	1	42.b	PERMISO GREMIAL	C/S D Titulares e interinos sin antigüedad.- Máximo 24 horas reloj mensuales.- Las no utilizadas pueden acreditarse sólo para el mes inmediato posterior, caducando el mismo una vez vencido el plazo y reiniciándose del proceso.- Hábiles SI 	t	\N	2026-06-08 23:24:40.432	2026-06-08 23:24:40.432
87	1	42.c	INTEGRACION DE COMISION GREMIAL SIN SUELDO	S/S R Titulares e interinos sin antigüedad.- Integrantes de Comisiones Directivas que excedan cupo máximo permitido según 42° a.- Por el tiempo que permanezca en la función efectiva. Corridos SI 	t	\N	2026-06-08 23:25:01.336	2026-06-08 23:25:01.336
88	1	45.a	INASISTENCIAS SIN AVISO	S/S D Titulares e interinos y reemplazantes sin antigüedad 3 días hábiles corridos para iniciar abandono de cargo, previa intimación por el término de 72 hs al reintegro o justificación. Hábiles SI	t	\N	2026-06-08 23:25:30.275	2026-06-08 23:25:30.275
89	1	45.b	INASISTENCIAS INJUSTIFICADAS	S/S D Titulares, interinos y reemplazantes sin antigüedad Sin límite Corridos SI	t	\N	2026-06-08 23:25:53.968	2026-06-08 23:25:53.968
90	1	45.d	INASISTENCIA POR TRÁMITE DE CESE POR ABANDONO DE CARGO	S/S D Titulares, interinos y reemplazantes sin antigüedad Se informa mientras se tramita el cese por abandono de cargo. Corridos SI	t	\N	2026-06-08 23:26:22.27	2026-06-08 23:26:22.27
91	1	52.a	RETENCION DE SUELDO POR NO PRESENT CERT. APT. PSICOFISICA	S/S D Titulares, interinos y reemplazantes sin antigüedad Sin límite Corridos NO	t	\N	2026-06-08 23:26:40.668	2026-06-08 23:26:40.668
92	1	52.b	TRAMITE DE CESANTIA POR INAPTITUD	S/S S Titulares, interinos y reemplazantes sin antigüedad Sin límite Corridos SI	t	\N	2026-06-08 23:27:06.418	2026-06-08 23:27:06.418
93	1	60.a	CAUSAS NO PREVISTAS EN EL REGLAMENTO (CON SUELDO)	C/S R Titulares, interinos y reemplazantes sin antigüedad Sin límite Corridos SI	t	\N	2026-06-08 23:27:44.857	2026-06-08 23:27:44.857
94	1	60.b	CAUSAS NO PREVISTA EN EL REGLAMENTO (SIN SUELDO)	S/S R Titulares, interinos y reemplazantes sin antigüedad Sin límite Corridos SI	t	\N	2026-06-08 23:28:08.944	2026-06-08 23:28:08.944
95	1	60.c	INASISTENCIA POR ORDEN JUDICIAL (solo para causas docentes	C/S D Titulares, interinos y reemplazantes sin antigüedad Por el plazo que indique la orden judicial. Corridos SI	t	\N	2026-06-08 23:28:28.133	2026-06-08 23:28:28.133
96	1	60.d	CAUSAS NO PREVISTAS EN EL REGLAMENTO P/PROF. ITINERANTES	CAUSAS NO PREVISTAS EN EL REGLAMENTO P/PROF. ITINERANTES	t	\N	2026-06-08 23:28:44.923	2026-06-08 23:28:44.923
97	1	61.0	DONACIÓN DE ORGANOS	C/S R Titulares, interinos y reemplazantes sin antigüedad A determinar según prescripción médica. Corridos SI 	t	\N	2026-06-08 23:29:12.867	2026-06-08 23:29:12.867
98	1	62.0	ADHESIÓN MEDIDAS DE FUERZA	S/S D Titulares, interinos y reemplazantes sin antigüedad Sin límite Corridos SI 	t	\N	2026-06-08 23:29:38.38	2026-06-08 23:29:38.38
99	1	63.a	TRASLADO INTERJURISDICCIONAL PROVISORIO	C/S RH Titulares 1 año antigüedad inmediata anterior en el cargo. Hasta el 31/12 de cada año y desde el inicio del ciclo lectivo de cada provincia. Corridos SI	t	\N	2026-06-08 23:30:10.36	2026-06-08 23:30:10.36
100	1	63.b	TRASLADO JURISDICCIONAL PREFERENCIAL	S/S R Titulares 1 año antigüedad inmediata anterior en el cargo. Hasta la fecha de efectivización del traslado de los agentes o limitación del mismo. Corridos SI	t	\N	2026-06-08 23:30:44.129	2026-06-08 23:30:44.129
101	1	64.0	PARO DE TRANSPORTE 	C/S D Titulares, interinos y reemplazantes sin antigüedad Sin límite Hábiles SI	t	\N	2026-06-08 23:31:02.207	2026-06-08 23:31:02.207
102	1	65.0	 SUSPENSION DE PERSONAL DOCENTE	S/S R Titulares, interinos y reemplazantes sin antigüedad Según Norma Legal. Corridos SI	t	\N	2026-06-08 23:31:28.475	2026-06-08 23:31:28.475
103	1	66.0	 DESIGNACIÓN COMO DIRECTOR ORGANIZADOR/REORGANIZADOR	C/S R Titulares e interinos sin antigüedad. (Solo por igual cargo al de destino) Por el tiempo que permanezca en la función. Corridos SI	t	\N	2026-06-08 23:31:56.879	2026-06-08 23:31:56.879
104	1	68.0	 DESPLAZAMIENTO POR SUMARIO	C/S R Titulares, interinos y reemplazantes sin antigüedad Por el tiempo que permanezca en la función. Corridos Si	t	\N	2026-06-08 23:32:23.162	2026-06-08 23:32:23.162
105	1	69.a	 RELEVOS PERSONAL DOCENTE (CON SUELDO)	C/S R Titulares, interinos y reemplazantes sin antigüedad Por el tiempo que permanezca en la función. Corridos SI	t	\N	2026-06-08 23:32:43.561	2026-06-08 23:33:11.828
106	1	69.b	 RELEVOS PERSONAL DOCENTE (SIN SUELDO	S/S R Titulares, interinos y reemplazantes sin antigüedad Por el tiempo que permanezca en la función. Corridos SI	t	\N	2026-06-08 23:33:29.789	2026-06-08 23:33:29.789
107	1	80.0	CARGA PÚBLICA (Ej. Censos)	C/S D Titulares, interinos y reemplazantes sin antigüedad Por el plazo que determine la autoridad competente Corridos SI 	t	\N	2026-06-08 23:33:57.418	2026-06-08 23:33:57.418
108	1	85.0	SUSPENSIÓN DE SERVICIO POR PRIVACIÓN DE LA LIBERTAD	S/S D Titulares, interinos y reemplazantes sin antigüedad Hasta que se determine el cese o reintegro del agente. Corridos SI	t	\N	2026-06-08 23:34:13.967	2026-06-08 23:34:13.967
109	1	92.0	REUBICACIÓN DE PERSONAL DECLARADO EN DISPONIBILIDAD no consignar si es personal reemplazante	REUBICACIÓN DE PERSONAL DECLARADO EN DISPONIBILIDAD no consignar si es personal reemplazante	t	\N	2026-06-08 23:34:34.214	2026-06-08 23:34:34.214
1	1	3.0	LICENCIA ANUAL ORDINARIA	Titulares, interinos y reemplazantes con: 8 m = proporcional 8 m a 5 años de antigüedad = 20 días 5 a 10 años = 25 días 10 a 15 años = 30 días 15 a 20 años = 35 días más de 20 años = 45 días / Máximo 45 días / Corridos / No durante el receso escolar. Son de uso obligatorio 	t	\N	2026-06-08 18:34:25.923	2026-06-12 23:07:18.586
\.


--
-- Data for Name: Comision; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Comision" (id, "institucionId", "cursoId", "turnoId", "unidadId", nombre, descripcion, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1	1	5	1° A	Primero A	t	\N	2026-06-08 23:41:13.7	2026-06-08 23:41:13.7
2	1	2	1	6	2° A	Segundo A	t	\N	2026-06-08 23:41:37.677	2026-06-08 23:41:37.677
3	1	3	1	7	3° A	Tercero A	t	\N	2026-06-08 23:41:57.793	2026-06-08 23:41:57.793
4	1	4	1	8	4° A	Cuarto A	t	\N	2026-06-08 23:42:20.851	2026-06-08 23:42:20.851
5	1	5	1	9	5° A	Quinto A	t	\N	2026-06-08 23:42:42.477	2026-06-14 15:02:29.511
\.


--
-- Data for Name: Curso; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Curso" (id, "institucionId", nombre, descripcion, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1° año	Primer año	t	\N	2026-06-08 23:39:30.06	2026-06-08 23:39:30.06
2	1	2° año	Segundo año	t	\N	2026-06-08 23:39:47.351	2026-06-08 23:39:47.351
3	1	3° año	Tercer año	t	\N	2026-06-08 23:40:00.997	2026-06-08 23:40:00.997
4	1	4° año	Cuarto año	t	\N	2026-06-08 23:40:13.368	2026-06-08 23:40:13.368
5	1	5° año	Quinto año	t	\N	2026-06-08 23:40:25.526	2026-06-08 23:40:25.526
\.


--
-- Data for Name: DistribucionHoraria; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."DistribucionHoraria" (id, "institucionId", "asignacionId", version, fecha_vigencia_desde, fecha_vigencia_hasta, estado, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1	1	2026-06-01 00:00:00	\N	ACTIVO	t	\N	2026-06-15 19:52:02.787	2026-06-15 19:52:02.787
\.


--
-- Data for Name: DistribucionModulo; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."DistribucionModulo" ("distribucionHorariaId", "moduloHorarioId", "createdAt", "updatedAt") FROM stdin;
1	14	2026-06-15 19:52:24.646	2026-06-15 19:52:24.646
1	24	2026-06-15 19:52:24.646	2026-06-15 19:52:24.646
1	40	2026-06-15 19:52:24.646	2026-06-15 19:52:24.646
\.


--
-- Data for Name: HorarioAsignado; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."HorarioAsignado" (id, "institucionId", "agenteId", "asignacionId", "distribucionHorariaId", "moduloHorarioId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Incidencia; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Incidencia" (id, "asignacionId", fecha_desde, fecha_hasta, "codigarioItemId", observacion, activo, "deletedAt", "createdAt", "updatedAt", "incidenciaPadreId") FROM stdin;
1	1	2026-07-06 00:00:00	2026-07-10 00:00:00	2	\N	t	\N	2026-06-15 19:54:31.316	2026-06-15 19:54:31.316	\N
2	1	2026-07-07 00:00:00	2026-07-07 00:00:00	49	\N	t	\N	2026-06-15 20:21:17.871	2026-06-15 20:21:17.871	1
3	1	2026-08-10 00:00:00	2026-08-14 00:00:00	2	\N	t	\N	2026-06-15 20:34:41.64	2026-06-15 20:34:41.64	\N
6	1	2026-08-12 00:00:00	2026-08-12 00:00:00	49	\N	t	\N	2026-06-15 20:41:56.614	2026-06-15 20:41:56.614	3
8	1	2026-11-01 00:00:00	2026-11-30 00:00:00	2	\N	t	\N	2026-06-17 19:14:41.632	2026-06-17 19:14:41.632	\N
9	1	2026-11-18 00:00:00	2026-11-18 00:00:00	49	\N	t	\N	2026-06-17 19:16:11.728	2026-06-17 19:16:11.728	8
10	1	2026-07-02 00:00:00	2026-07-03 00:00:00	8	asdas	t	\N	2026-07-02 21:38:22.843	2026-07-02 21:40:27.954	\N
\.


--
-- Data for Name: Institucion; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Institucion" (id, nombre, dominio, configuracion, domicilio, telefono, email, cuit, estado, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	Escuela Primaria N°12	escuela12.edu.ar	{"usaCursos": true, "usaMaterias": true, "modulosDuracionMinutos": 40}	Av. San Martín 450, Rosario	0341-4100100	info@escuela12.edu.ar	30-12345678-9	ACTIVO	t	\N	2026-06-08 18:07:26.891	2026-06-08 18:07:26.891
2	Sanatorio del Sur	sanatoriosur.com.ar	{"usaCursos": false, "usaMaterias": false, "modulosDuracionMinutos": 60}	Córdoba 1200, Rosario	0341-4200200	info@sanatoriosur.com.ar	30-98765432-1	ACTIVO	t	\N	2026-06-08 18:07:26.897	2026-06-08 18:07:26.897
\.


--
-- Data for Name: Materia; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Materia" (id, "institucionId", "cursoId", nombre, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1	Ruedas de convivencia	t	\N	2026-06-15 13:56:55.211	2026-06-15 13:56:55.211
3	1	1	Ruedas de convivencia I	f	2026-06-15 19:50:12.633	2026-06-15 13:59:02.765	2026-06-15 19:50:12.634
4	1	1	Ruedas	f	2026-06-15 19:50:17.72	2026-06-15 14:03:38.992	2026-06-15 19:50:17.721
\.


--
-- Data for Name: ModuloHorario; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ModuloHorario" (id, "institucionId", dia_semana, hora_desde, hora_hasta, "turnoId", activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
33	1	VIERNES	450	490	1	t	\N	2026-06-08 23:44:44.781	2026-06-08 23:44:44.781
1	1	LUNES	540	580	1	t	\N	2026-06-08 23:44:44.298	2026-06-08 23:45:35.41
19	1	MIERCOLES	540	580	1	t	\N	2026-06-08 23:44:44.582	2026-06-08 23:46:17.982
30	1	JUEVES	670	705	1	t	\N	2026-06-08 23:44:44.681	2026-06-08 23:55:24.563
39	1	VIERNES	715	755	1	t	\N	2026-06-08 23:44:44.862	2026-06-08 23:58:01.783
8	1	LUNES	755	795	1	t	\N	2026-06-08 23:44:44.391	2026-06-08 23:58:16.244
16	1	MARTES	755	795	1	t	\N	2026-06-08 23:44:44.51	2026-06-12 23:31:46.839
3	1	LUNES	490	530	1	t	\N	2026-06-08 23:44:44.297	2026-06-08 23:44:44.297
10	1	MARTES	490	530	1	t	\N	2026-06-08 23:44:44.404	2026-06-08 23:44:44.404
34	1	VIERNES	490	530	1	t	\N	2026-06-08 23:44:44.781	2026-06-08 23:44:44.781
28	1	JUEVES	580	620	1	t	\N	2026-06-08 23:44:44.679	2026-06-08 23:47:49.269
22	1	MIERCOLES	670	705	1	t	\N	2026-06-08 23:44:44.585	2026-06-08 23:55:11.961
15	1	MARTES	715	755	1	t	\N	2026-06-08 23:44:44.509	2026-06-08 23:56:32.375
11	1	MARTES	540	580	1	t	\N	2026-06-08 23:44:44.405	2026-06-08 23:45:51.538
27	1	JUEVES	540	580	1	t	\N	2026-06-08 23:44:44.678	2026-06-08 23:46:29.526
35	1	VIERNES	540	580	1	t	\N	2026-06-08 23:44:44.782	2026-06-08 23:46:44.877
4	1	LUNES	630	670	1	t	\N	2026-06-08 23:44:44.3	2026-06-08 23:48:59.799
13	1	MARTES	630	670	1	t	\N	2026-06-08 23:44:44.496	2026-06-08 23:49:11.65
24	1	MIERCOLES	755	795	1	t	\N	2026-06-08 23:44:44.586	2026-06-08 23:58:36.914
40	1	VIERNES	755	795	1	t	\N	2026-06-08 23:44:44.863	2026-06-08 23:59:26.052
18	1	MIERCOLES	490	530	1	t	\N	2026-06-08 23:44:44.51	2026-06-08 23:44:44.51
26	1	JUEVES	490	530	1	t	\N	2026-06-08 23:44:44.676	2026-06-08 23:44:44.676
2	1	LUNES	580	620	1	t	\N	2026-06-08 23:44:44.298	2026-06-08 23:47:04.347
21	1	MIERCOLES	630	670	1	t	\N	2026-06-08 23:44:44.585	2026-06-08 23:49:28.126
37	1	VIERNES	630	670	1	t	\N	2026-06-08 23:44:44.861	2026-06-08 23:49:56.404
7	1	LUNES	715	755	1	t	\N	2026-06-08 23:44:44.39	2026-06-08 23:56:16.063
32	1	JUEVES	755	795	1	t	\N	2026-06-08 23:44:44.781	2026-06-08 23:59:12.267
6	1	LUNES	450	490	1	t	\N	2026-06-08 23:44:44.299	2026-06-08 23:44:44.299
9	1	MARTES	450	490	1	t	\N	2026-06-08 23:44:44.403	2026-06-08 23:44:44.403
17	1	MIERCOLES	450	490	1	t	\N	2026-06-08 23:44:44.51	2026-06-08 23:44:44.51
25	1	JUEVES	450	490	1	t	\N	2026-06-08 23:44:44.676	2026-06-08 23:44:44.676
12	1	MARTES	580	620	1	t	\N	2026-06-08 23:44:44.406	2026-06-08 23:47:24.431
20	1	MIERCOLES	580	620	1	t	\N	2026-06-08 23:44:44.582	2026-06-08 23:47:36.839
36	1	VIERNES	580	620	1	t	\N	2026-06-08 23:44:44.782	2026-06-08 23:48:08.677
29	1	JUEVES	630	670	1	t	\N	2026-06-08 23:44:44.68	2026-06-08 23:49:42.047
5	1	LUNES	670	705	1	t	\N	2026-06-08 23:44:44.316	2026-06-08 23:54:51.819
14	1	MARTES	670	705	1	t	\N	2026-06-08 23:44:44.508	2026-06-08 23:55:00.805
38	1	VIERNES	670	705	1	t	\N	2026-06-08 23:44:44.862	2026-06-08 23:55:38.894
23	1	MIERCOLES	715	755	1	t	\N	2026-06-08 23:44:44.586	2026-06-08 23:57:05.84
31	1	JUEVES	715	755	1	t	\N	2026-06-08 23:44:44.779	2026-06-08 23:57:44.56
\.


--
-- Data for Name: PeriodoOperativo; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."PeriodoOperativo" (id, "institucionId", nombre, fecha_desde, fecha_hasta, "deletedAt", "createdAt", "updatedAt", vigente) FROM stdin;
2	1	Ciclo lectivo 2027	2027-01-01 00:00:00	2027-12-31 00:00:00	\N	2026-06-09 18:25:29.265	2026-06-09 18:31:03.854	f
1	1	Ciclo lectivo 2026	2026-01-01 00:00:00	2026-12-31 00:00:00	\N	2026-06-08 18:09:20.321	2026-06-09 18:31:03.855	t
\.


--
-- Data for Name: Reemplazo; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Reemplazo" (id, "claseId", "asignacionTitularId", observacion, activo, "deletedAt", "createdAt", "agenteSuplenteId") FROM stdin;
2	17	1	\N	t	\N	2026-06-15 20:17:31.281	2
1	16	1	\N	f	2026-06-15 20:32:00.746	2026-06-15 20:16:27.793	2
4	33	1	\N	t	\N	2026-06-15 20:35:02.082	3
5	31	1	\N	t	\N	2026-06-15 20:35:02.083	3
3	32	1	\N	f	2026-06-15 20:53:52.98	2026-06-15 20:35:02.078	3
6	32	1	\N	f	2026-06-15 20:54:20.218	2026-06-15 20:53:59.555	2
7	32	1	\N	f	2026-06-15 21:12:33.914	2026-06-15 20:54:26.534	3
8	32	1	\N	t	\N	2026-06-15 21:18:17.524	2
9	72	1	\N	t	\N	2026-06-17 19:14:56.526	3
10	71	1	\N	t	\N	2026-06-17 19:14:56.532	3
11	70	1	\N	t	\N	2026-06-17 19:14:56.532	3
12	67	1	\N	t	\N	2026-06-17 19:14:56.534	3
13	68	1	\N	t	\N	2026-06-17 19:14:56.537	3
14	69	1	\N	t	\N	2026-06-17 19:14:56.542	3
15	73	1	\N	t	\N	2026-06-17 19:14:56.604	3
17	76	1	\N	t	\N	2026-06-17 19:14:56.606	3
18	77	1	\N	t	\N	2026-06-17 19:14:56.609	3
19	78	1	\N	t	\N	2026-06-17 19:14:56.61	3
16	74	1	\N	f	2026-06-17 19:16:12.354	2026-06-17 19:14:56.605	3
20	74	1	\N	t	\N	2026-06-17 19:16:12.383	2
21	15	1	\N	f	2026-07-02 21:38:45.889	2026-07-02 21:38:34.753	3
22	15	1	\N	f	2026-07-02 21:39:06.447	2026-07-02 21:39:04.156	3
\.


--
-- Data for Name: Rol; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Rol" (id, nombre, descripcion, "createdAt") FROM stdin;
1	ADMIN	Administrador de institución	2026-06-08 18:07:26.826
2	DIRECTIVO	Director o vicedirector	2026-06-08 18:07:26.832
3	DOCENTE	Profesor / docente	2026-06-08 18:07:26.835
4	VIEWER	Solo lectura	2026-06-08 18:07:26.837
\.


--
-- Data for Name: Sesion; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Sesion" (id, "usuarioId", "institucionId", token, ip, "userAgent", "createdAt", "expiresAt") FROM stdin;
6	2	1	bf1cc051-7e6b-40ec-afd0-f74f2938edbc	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-15 13:53:45.685	2026-06-22 13:53:45.683
9	2	1	0cf4561f-dfa0-496d-a1d1-94a5b496810e	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-18 20:23:42.803	2026-06-25 20:23:42.801
12	2	1	c018f3b5-cd2b-47d6-804e-7b79b51cee22	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-20 19:45:43.369	2026-06-27 19:45:43.367
13	2	1	2bde8e55-f904-40e9-9ebf-440cbf16ffb9	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-21 14:16:18.714	2026-06-28 14:16:18.712
14	2	1	b5bbe61b-9719-4d06-a859-505c8c0eb937	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-21 18:48:10.973	2026-06-28 18:48:10.971
16	2	1	9169076d-2435-4652-8f92-36dcab2946c9	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-25 17:13:41.162	2026-07-02 17:13:41.16
17	2	1	17ad119a-a3db-4012-bf24-8aabbd3b7225	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-27 13:51:34.101	2026-07-04 13:51:34.099
18	2	1	55647a2f-ca46-4df6-a4a4-aea44d87926e	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-27 13:54:08.786	2026-07-04 13:54:08.784
21	2	1	06241cdf-2d5f-48a5-a4cd-77817161dc0a	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-06-29 20:46:57.011	2026-07-06 20:46:57.01
23	2	1	75bc2ee9-0783-4e31-9edb-b1191c5f2f42	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-07-01 22:44:09.484	2026-07-08 22:44:09.482
26	2	1	c9d0149e-1808-4063-9383-1425d5dd54b4	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-07-05 11:42:01.345	2026-07-12 11:42:01.343
\.


--
-- Data for Name: TitularAsignacion; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."TitularAsignacion" (id, "institucionId", "asignacionId", "agenteId", fecha_desde, fecha_hasta, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	1	1	2026-01-01 00:00:00	\N	t	\N	2026-06-15 19:51:17.24	2026-06-15 19:51:17.24
\.


--
-- Data for Name: Turno; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Turno" (id, "institucionId", nombre, "horaInicio", "horaFin", activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
1	1	Mañana	420	1080	t	\N	2026-06-08 23:38:56.569	2026-06-08 23:38:56.569
\.


--
-- Data for Name: UnidadOrganizativa; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."UnidadOrganizativa" (id, "institucionId", "codigoUnidad", nombre, tipo, estado, activo, "deletedAt", "createdAt", "updatedAt") FROM stdin;
2	1	2	Secretaria	ADMIN	ACTIVO	t	\N	2026-06-08 23:35:35.94	2026-06-08 23:35:35.94
3	1	3	Preceptoria	ADMIN	ACTIVO	t	\N	2026-06-08 23:35:47.208	2026-06-08 23:35:47.208
4	1	4	Porteria	OTRA	ACTIVO	t	\N	2026-06-08 23:36:02.116	2026-06-08 23:36:02.116
5	1	5	AULA 1	AULA	ACTIVO	t	\N	2026-06-08 23:36:27.278	2026-06-08 23:36:27.278
6	1	6	AULA 2	AULA	ACTIVO	t	\N	2026-06-08 23:36:41.528	2026-06-08 23:36:41.528
7	1	7	AULA 3	AULA	ACTIVO	t	\N	2026-06-08 23:36:58.902	2026-06-08 23:36:58.902
8	1	8	AULA 4	AULA	ACTIVO	t	\N	2026-06-08 23:37:18.655	2026-06-12 23:37:45.723
1	1	1	Direccion	ADMIN	ACTIVO	t	\N	2026-06-08 23:35:17.016	2026-06-12 23:38:27.811
9	1	9	AULA 5	AULA	ACTIVO	t	\N	2026-06-08 23:38:10.892	2026-06-12 23:50:40.564
\.


--
-- Data for Name: Usuario; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Usuario" (id, email, "passwordHash", nombre, "esSuperAdmin", estado, activo, "createdAt", "updatedAt") FROM stdin;
1	superadmin@plataforma.com	$2b$10$odJd76WSUagFZbqOd.4Eguu50HKmsMsM7ntgzkr1bFOnOeSs4DFx2	Super Admin	t	ACTIVO	t	2026-06-08 18:07:26.879	2026-06-08 18:07:26.879
2	admin@escuela12.edu.ar	$2b$10$odJd76WSUagFZbqOd.4Eguu50HKmsMsM7ntgzkr1bFOnOeSs4DFx2	Admin Escuela	f	ACTIVO	t	2026-06-08 18:07:26.884	2026-06-08 18:07:26.884
3	admin@sanatoriosur.com.ar	$2b$10$odJd76WSUagFZbqOd.4Eguu50HKmsMsM7ntgzkr1bFOnOeSs4DFx2	Admin Sanatorio	f	ACTIVO	t	2026-06-08 18:07:26.888	2026-06-08 18:07:26.888
\.


--
-- Data for Name: UsuarioRol; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."UsuarioRol" ("usuarioId", "rolId", "institucionId") FROM stdin;
1	1	1
1	1	2
2	1	1
3	1	2
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
cc442d81-156d-4e14-bd7a-d93780d4899c	beed725451f04e2b48d7691e42c5887f0a8bb9da3db8c36cfacdeac9da3d06df	2026-06-08 18:07:24.866464+00	20260515213133_init	\N	\N	2026-06-08 18:07:24.7654+00	1
c5f17cf9-e076-4028-be6b-b918dbb91ec0	1921fa6a3c4c15609cee3dac976b7dd8f3d681d6090ae9cf17981cedc15445a6	2026-06-08 18:07:24.875072+00	20260521201259_add_agente_suplente_reemplazo	\N	\N	2026-06-08 18:07:24.868147+00	1
700d4f99-623e-40eb-b664-0d729e340adb	cdfbddb27e88781e2330607ec9fd0c6ce1a692db10fb5df436862744025313dd	2026-06-08 18:07:24.887794+00	20260523145022_add_periodo_operativo	\N	\N	2026-06-08 18:07:24.87676+00	1
7cdb7106-6a68-4e56-844b-42112fa6fd4e	9b9795f2b56d536d26705d90f67becd5d37230bb87de81d47f483b71c38ffe79	2026-06-08 18:07:24.893924+00	20260523223108_rename_activo_to_vigente_periodo_operativo	\N	\N	2026-06-08 18:07:24.889305+00	1
63992c0c-e369-4f34-b1ec-5219239cfbd9	700f00c4d51c0450406e1e8f184fa2945ccfc3c49963ee139ef7ec453f8fd756	2026-06-08 18:07:24.903334+00	20260524230327_add_cadena_reemplazo	\N	\N	2026-06-08 18:07:24.895653+00	1
dbfb23a8-3701-4e9a-a381-3a0226400d28	5cd66bdfc0fd03c2b71906fc5f64d66db513741093f156ecaec55a71a3a311a3	2026-06-08 18:07:24.909461+00	20260525110614_remove_cadena_reemplazo	\N	\N	2026-06-08 18:07:24.904961+00	1
\.


--
-- Name: Agente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Agente_id_seq"', 3, true);


--
-- Name: Asignacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Asignacion_id_seq"', 1, true);


--
-- Name: CalendarioEscolar_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."CalendarioEscolar_id_seq"', 19, true);


--
-- Name: ClaseProgramada_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."ClaseProgramada_id_seq"', 92, true);


--
-- Name: CodigarioItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."CodigarioItem_id_seq"', 109, true);


--
-- Name: Codigario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Codigario_id_seq"', 3, true);


--
-- Name: Comision_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Comision_id_seq"', 5, true);


--
-- Name: Curso_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Curso_id_seq"', 5, true);


--
-- Name: DistribucionHoraria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."DistribucionHoraria_id_seq"', 1, true);


--
-- Name: HorarioAsignado_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."HorarioAsignado_id_seq"', 1, false);


--
-- Name: Incidencia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Incidencia_id_seq"', 10, true);


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

SELECT pg_catalog.setval('public."ModuloHorario_id_seq"', 40, true);


--
-- Name: PeriodoOperativo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."PeriodoOperativo_id_seq"', 2, true);


--
-- Name: Reemplazo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Reemplazo_id_seq"', 22, true);


--
-- Name: Rol_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Rol_id_seq"', 4, true);


--
-- Name: Sesion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Sesion_id_seq"', 26, true);


--
-- Name: TitularAsignacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."TitularAsignacion_id_seq"', 1, true);


--
-- Name: Turno_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Turno_id_seq"', 1, true);


--
-- Name: UnidadOrganizativa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."UnidadOrganizativa_id_seq"', 9, true);


--
-- Name: Usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Usuario_id_seq"', 3, true);


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

\unrestrict dAAH9G6Icsagf429wntgFd7eS5rbfAEgt87jcDnumIGOpAaDK2u7wdH5aPQQe8g

