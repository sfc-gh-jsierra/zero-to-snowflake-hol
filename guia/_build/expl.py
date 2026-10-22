import json, re, sys
sys.path.insert(0, '.')
from add_comments import statements_with_spans

R = {
'lab0_setup': [
 "Creamos la base TB_101, los roles y los warehouses de la demo con sus permisos para que cada rol vea solo lo suyo.",
 "Creamos los warehouses, los roles y los privilegios que separan las funciones de administrador, ingeniero, desarrollador y analista.",
 "Definimos el formato de archivo, los stages hacia S3 y las tablas raw donde aterrizan los datos de Tasty Bytes.",
 "Armamos las vistas por capas (harmonized, analytics, semantic layer) que luego consumen los analistas y la IA.",
 "Cargamos las resenas desde S3 y dejamos listos los permisos de IA y el stage donde viviran los archivos multimodales.",
 "Subimos por la interfaz los archivos de ejemplo al stage ARCHIVOS para usarlos mas adelante con funciones de IA.",
 "Construimos la capa de negocio y verificamos que la carga quedo completa con conteos de filas.",
],
'lab1_fundamentos': [
 "Fijamos el contexto de trabajo y creamos nuestro primer warehouse para ver como se configura el computo en Snowflake.",
 "Encendemos computo propio y comprobamos que en Snowflake el almacenamiento y el computo son independientes.",
 "Escalamos el warehouse en segundos y vemos como el Result Cache devuelve resultados repetidos sin gastar computo.",
 "Clonamos una tabla sin duplicar datos y consultamos campos JSON para enriquecer el catalogo de camiones.",
 "Corregimos datos en el clon y lo promovemos a produccion con un SWAP atomico, sin afectar a los usuarios.",
 "Borramos una tabla por error y la recuperamos con Time Travel, sin backups ni restauraciones manuales.",
 "Ponemos un tope de creditos al warehouse con un Resource Monitor para controlar el gasto.",
 "Revisamos desde la interfaz los Budgets de costos y la busqueda universal para encontrar objetos y datos.",
],
'lab2_pipeline': [
 "Traemos el menu de Tasty Bytes desde S3 a una tabla con un stage y COPY INTO, la base de todo pipeline.",
 "Leemos JSON como VARIANT y lo aplanamos con FLATTEN para convertir datos semi-estructurados en columnas utilizables.",
 "Creamos una Dynamic Table que se mantiene actualizada sola, sin programar tareas ni orquestadores.",
 "Encadenamos Dynamic Tables para calcular el consumo de ingredientes por camion y vemos como se propagan los cambios.",
 "Visualizamos en la interfaz el grafo del pipeline y el estado de refresco de cada tabla.",
],
'lab3_cortex_aisql': [
 "Comparamos modelos de lenguaje lado a lado en el Playground para elegir el mas adecuado a cada caso.",
 "Hacemos una pregunta de negocio a un LLM directamente desde SQL con AI_COMPLETE.",
 "Medimos el sentimiento de las resenas por marca y por aspecto para ver donde estan las fortalezas y los problemas.",
 "Clasificamos automaticamente las resenas por tema para saber de que hablan los clientes sin leerlas una a una.",
 "Extraemos datos puntuales desde texto libre de las resenas y los dejamos como columnas estructuradas.",
 "Resumimos todas las resenas de cada marca y las traducimos al espanol para entregar un resumen ejecutivo.",
 "Usamos Cortex Code para cruzar el sentimiento de los clientes con las ventas mediante lenguaje natural.",
],
}

def cm(k, first):
    k = k.lower()
    ru = [
     (r'^create or replace database', 'Crea la base de datos TB_101'),
     (r'^create or replace warehouse', 'Crea el warehouse de la demo'),
     (r'^create role', 'Crea el rol'),
     (r'^grant role .* to role', 'Asigna el rol a la jerarquia de roles'),
     (r'^grant role .* to user', 'Asigna los roles a tu usuario'),
     (r'^grant imported privileges', 'Da acceso a las vistas de metadatos de Snowflake'),
     (r'^grant create warehouse', 'Permite crear warehouses al rol admin'),
     (r'^grant usage on database', 'Da uso de la base a los roles'),
     (r'^grant usage on all schemas', 'Da uso de todos los esquemas a los roles'),
     (r'^grant all on schema', 'Da todos los permisos sobre los esquemas'),
     (r'^grant all on warehouse', 'Da permisos sobre los warehouses a los roles'),
     (r'^grant all on future', 'Da permisos sobre objetos futuros de los esquemas'),
     (r'^grant apply masking', 'Permite aplicar politicas de enmascaramiento'),
     (r'^grant operate', 'Permite al analista usar su warehouse'),
     (r'^grant usage on warehouse', 'Permite al desarrollador usar el warehouse'),
     (r'^grant usage on schema', 'Da uso del esquema al rol'),
     (r'^grant select on (table|view)', 'Da lectura del objeto al rol'),
     (r'^grant (read|write) on stage|^grant read, write', 'Da permisos sobre el stage al rol'),
     (r'^grant read on stage', 'Da lectura del stage al rol'),
     (r'^grant select on all', 'Da lectura de todas las tablas o vistas al analista'),
     (r'^grant database role', 'Da acceso a las funciones Cortex AI'),
     (r'^grant usage on file format', 'Da uso del file format al ingeniero'),
     (r'^grant usage on all', 'Da uso de los objetos al analista'),
     (r'^grant ', 'Otorga permisos al rol'),
     (r'^create schema', 'Crea el esquema para los agentes'),
     (r'^set my_user', 'Guarda tu usuario actual en una variable'),
     (r'^create or replace file format', 'Crea el formato de archivo CSV'),
     (r'^create or replace stage tb_101.public.archivos', 'Crea el stage interno para archivos multimodales'),
     (r'^create or replace stage', 'Crea el stage externo apuntando a S3'),
     (r'^create or replace table', 'Crea la tabla'),
     (r'^create or replace view', 'Crea la vista'),
     (r'^create or replace dynamic table', 'Crea la Dynamic Table que se refresca sola'),
     (r'^create or replace resource monitor', 'Crea el Resource Monitor con tope de creditos'),
     (r'^copy into', 'Carga los datos desde el stage a la tabla'),
     (r'^alter warehouse .* resource_monitor', 'Asocia el Resource Monitor al warehouse'),
     (r'^alter warehouse .* auto_resume', 'Activa el encendido automatico del warehouse'),
     (r"^alter warehouse .*'xlarge'", 'Escala el warehouse a XLarge'),
     (r"^alter warehouse .*'xsmall'", 'Devuelve el warehouse a XSmall'),
     (r'^alter table .* add column', 'Agrega una columna a la tabla'),
     (r'^alter table .* drop column', 'Elimina la columna JSON ya extraida'),
     (r'^use role', 'Cambia al rol de trabajo'),
     (r'^use database', 'Selecciona la base de datos'),
     (r'^use warehouse', 'Selecciona el warehouse de computo'),
     (r'^show warehouses', 'Lista los warehouses de la cuenta'),
     (r'^show resource monitors', 'Verifica el Resource Monitor creado'),
     (r'^list @', 'Lista los archivos del stage'),
     (r'^drop table', 'Borra la tabla'),
     (r'^update ', 'Corrige los valores mal escritos'),
     (r'^insert into', 'Inserta una orden de prueba'),
     (r'^with ', 'Analiza una muestra de resenas con funciones de IA'),
     (r'^select ai_complete', 'Consulta al LLM directamente desde SQL'),
     (r'^select ai_translate|^select truck_brand_name, ai_translate', 'Resume las resenas por marca y las traduce'),
     (r'^select \* from', 'Revisa los datos resultantes'),
     (r'^select .*group by', 'Cuenta registros por categoria'),
     (r'^select .*flatten|^select menu_item_name', 'Aplana el JSON en columnas'),
     (r'^select ', 'Consulta los datos'),
    ]
    for p, t in ru:
        if re.search(p, k):
            return t
    return 'Ejecuta la sentencia'

total = {}
for lab, res in R.items():
    p = f'content/{lab}.json'
    d = json.load(open(p))
    assert len(d['steps']) == len(res)
    n = 0
    new = []
    for s, r in zip(d['steps'], res):
        ns = {}
        for k, v in s.items():
            ns[k] = v
            if k == 'badge':
                ns['resumen'] = r
        new.append(ns)
        for b in ns['blocks']:
            if b['type'] != 'code' or b.get('lang', 'sql') != 'sql':
                continue
            lines = b['code'].split('\n')
            ins = []
            prev_kind = None
            for st, key in statements_with_spans(b['code']):
                prev = lines[st-1].strip() if st > 0 else ''
                kind = key.split()[0] + (' ' + key.split()[1] if key.startswith('grant') else '')
                consecutive = prev_kind is not None and prev_kind == kind and st > 0 and prev.endswith(';') and not key.startswith('create')
                prev_kind = kind
                if prev.startswith('--') or consecutive:
                    if prev.startswith('--'): pass
                    continue
                ind = re.match(r'\s*', lines[st]).group(0)
                ins.append((st, ind + '-- ' + cm(key, True)))
            for st, c in reversed(ins):
                lines.insert(st, c); n += 1
            b['code'] = '\n'.join(lines)
    d['steps'] = new
    json.dump(d, open(p, 'w'), ensure_ascii=False, indent=2)
    open(p, 'a').write('\n')
    total[lab] = (len(res), n)
print(total)
