from django.core.management.base import BaseCommand
from apps.modismos.models import Modismo, Significado, EjemploUso

class Command(BaseCommand):
    help = 'Puebla la base de datos con 76 nuevos modismos ecuatorianos verificados para completar 100 en total (Etapa 4)'

    def handle(self, *args, **options):
        nuevos_modismos = [
            # ==========================================
            # SIERRA (Carchi, Pichincha, Imbabura, Cotopaxi, Chimborazo, Tungurahua, Azuay, Loja, Bolívar)
            # ==========================================
            {
                "nombre": "pupo",
                "descripcion": "Gentilicio popular y apelativo de orgullo para el carchense o tulcaneño; asociado a valentía y perseverancia. Fuente: Diccionario de Ecuatorianismos / Tradición Oral del Carchi.",
                "region": "Sierra / Carchi",
                "significados": ["Persona originaria de la provincia del Carchi, reconocida por su carácter laborioso y aguerrido."],
                "ejemplos": [
                    {"ejemplo": "El carchense es pupo de corazón, trabajador y solidario.", "contexto": "Identidad regional / Cotidiano"}
                ]
            },
            {
                "nombre": "chulquero",
                "descripcion": "Prestamista informal que cobra tasas de interés usurarias al margen del sistema financiero. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra / Nacional",
                "significados": ["Persona que presta dinero con intereses excesivamente altos de manera ilegal."],
                "ejemplos": [
                    {"ejemplo": "No le pidas dinero al chulquero porque te cobrará intereses altísimos.", "contexto": "Finanzas cotidianas / Familiar"}
                ]
            },
            {
                "nombre": "chumado / estar chumado",
                "descripcion": "Estado de embriaguez o intoxicación etílica (del quichua 'chuma'). Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra / Nacional",
                "significados": ["Persona que se encuentra ebria o tomada por consumir bebidas alcohólicas."],
                "ejemplos": [
                    {"ejemplo": "Ayer en la reunión mi primo terminó bien chumado de tanto canelazo.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "acholado / acholarse",
                "descripcion": "Sentimiento de vergüenza, timidez o apocamiento social. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra / Nacional",
                "significados": ["Persona apenada, tímida o avergonzada ante una situación pública o social."],
                "ejemplos": [
                    {"ejemplo": "No te acholes y pasa adelante a dar tu opinión.", "contexto": "Académico / Familiar"}
                ]
            },
            {
                "nombre": "carishina",
                "descripcion": "Término kichwa ('cari'=hombre, 'shina'=como). Persona o mujer que no se apega a las tareas domésticas tradicionales. Fuente: Academia Ecuatoriana de la Lengua.",
                "region": "Sierra",
                "significados": ["Persona poco diestra o desinteresada en las labores culinarias o del hogar."],
                "ejemplos": [
                    {"ejemplo": "Mi abuela decía en broma que si no aprendía a cocinar me dirían carishina.", "contexto": "Familiar tradicional"}
                ]
            },
            {
                "nombre": "longo / longa",
                "descripcion": "Término kichwa ('lungu'=joven). Joven, muchacho; en habla cotidiana adquiere matiz cariñoso o despectivo según el tono. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra",
                "significados": ["Joven, muchacho o adolescente en la serranía ecuatoriana."],
                "ejemplos": [
                    {"ejemplo": "Ese longo es muy responsable y dedicado a sus estudios universitarios.", "contexto": "Coloquial serrano"}
                ]
            },
            {
                "nombre": "suco / suca",
                "descripcion": "Persona de tez clara o cabello rubio o castaño claro. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra",
                "significados": ["Persona rubia o de cabello claro en el habla popular andina."],
                "ejemplos": [
                    {"ejemplo": "Pregúntale al suco de la tienda si ya tienen pan fresco.", "contexto": "Cotidiano informal"}
                ]
            },
            {
                "nombre": "guarango",
                "descripcion": "Árbol andino tradicional o persona grosera, rústica o descortés. Fuente: Diccionario de la Lengua Española (RAE).",
                "region": "Sierra / Pichincha",
                "significados": ["Persona maleducada, tosca o grosera en su trato con los demás."],
                "ejemplos": [
                    {"ejemplo": "No seas guarango y saluda con educación al entrar al aula.", "contexto": "Normas de cortesía / Social"}
                ]
            },
            {
                "nombre": "chaquiñán",
                "descripcion": "Sendero angosto, camino peatonal o atajo de tierra en el campo andino (kichwa 'chaqui'=pie, 'ñan'=camino). Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra",
                "significados": ["Atajo o sendero rústico peatonal entre montañas o terrenos agrícolas."],
                "ejemplos": [
                    {"ejemplo": "Nos fuimos por el chaquiñán para llegar más rápido a la carretera principal.", "contexto": "Rural / Viajes"}
                ]
            },
            {
                "nombre": "arrarray",
                "descripcion": "Exclamación kichwa que manifiesta dolor o ardor producido por calor intenso o quemadura. Fuente: Academia Ecuatoriana de la Lengua.",
                "region": "Sierra / Carchi / Imbabura",
                "significados": ["Expresión usada para denotar quemadura o sensación de calor ardiente."],
                "ejemplos": [
                    {"ejemplo": "¡Arrarray! La tetera estaba hirviendo y me quemé la mano.", "contexto": "Expresión espontánea"}
                ]
            },
            {
                "nombre": "ayayay",
                "descripcion": "Exclamación de dolor físico repentino o pesar. Fuente: Diccionario de la Lengua Española (RAE).",
                "region": "Sierra / Nacional",
                "significados": ["Expresión que denota dolor agudo, susto o queja física."],
                "ejemplos": [
                    {"ejemplo": "¡Ayayay! Me tropecé con la grada y me lastimé el tobillo.", "contexto": "Cotidiano"}
                ]
            },
            {
                "nombre": "atatau",
                "descripcion": "Interjección kichwa que expresa repugnancia, asco o desagrado intenso. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra",
                "significados": ["Exclamación de asco o desagrado ante algo sucio, descompuesto o hediondo."],
                "ejemplos": [
                    {"ejemplo": "¡Atatau! Esa fruta se dañó por dejarla varios días bajo el sol.", "contexto": "Conversación familiar"}
                ]
            },
            {
                "nombre": "ananshai",
                "descripcion": "Interjección dialectal del Carchi y la frontera norte para expresar ternura, lástima o conmiseración. Fuente: Vocabulario Popular del Carchi.",
                "region": "Sierra / Carchi",
                "significados": ["Expresión de ternura, compasión o cariño ante un ser indefenso."],
                "ejemplos": [
                    {"ejemplo": "¡Ananshai! Miren a ese gatito huérfano cómo busca a su mamá.", "contexto": "Afectivo / Cotidiano"}
                ]
            },
            {
                "nombre": "morlaco / morlaca",
                "descripcion": "Gentilicio coloquial cariñoso para los habitantes de Cuenca y la provincia del Azuay. Fuente: Diccionario de la Lengua Española (RAE).",
                "region": "Sierra / Azuay",
                "significados": ["Persona nacida o residente en la ciudad de Cuenca o en la provincia del Azuay."],
                "ejemplos": [
                    {"ejemplo": "Los morlacos celebraron las fiestas de independencia de Cuenca con música y desfiles.", "contexto": "Cultural / Regional"}
                ]
            },
            {
                "nombre": "chola cuencana",
                "descripcion": "Símbolo de la mujer mestiza tradicional cuencana, reconocida por su atuendo de polleras bordadas y sombrero de paja toquilla. Fuente: Patrimonio Cultural del Ecuador.",
                "region": "Sierra / Azuay",
                "significados": ["Mujer mestiza tradicional de Cuenca, figura emblemática de la cultura azuaya."],
                "ejemplos": [
                    {"ejemplo": "La chola cuencana desfiló con su elegante traje típico y sombrero de paja toquilla.", "contexto": "Folklore / Identidad"}
                ]
            },
            {
                "nombre": "guagua de pan",
                "descripcion": "Pan dulce en forma antropomórfica decorado con glasé de colores; tradición andina del Día de Difuntos. Fuente: Patrimonio Cultural Inmaterial del Ecuador.",
                "region": "Sierra / Nacional",
                "significados": ["Pan dulce con figura humana decorada, consumido en noviembre junto a la colada morada."],
                "ejemplos": [
                    {"ejemplo": "En noviembre preparamos colada morada y compramos guaguas de pan para compartir.", "contexto": "Gastronomía festiva"}
                ]
            },
            {
                "nombre": "llapingacho",
                "descripcion": "Plato típico de la sierra central consistente en tortillas asadas de papa con queso servidas con chorizo y huevo frito. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra / Tungurahua",
                "significados": ["Tortilla asada de papa rellena de queso, plato tradicional de Ambato y la Sierra."],
                "ejemplos": [
                    {"ejemplo": "En el mercado de Ambato comimos un delicioso plato de llapingachos con fritada.", "contexto": "Gastronómico"}
                ]
            },
            {
                "nombre": "chagra",
                "descripcion": "Campesino y hábil jinete de los valles andinos y páramos de la serranía ecuatoriana. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra / Pichincha / Cotopaxi",
                "significados": ["Jinete y campesino tradicional andino, experto en labores ganaderas de páramo."],
                "ejemplos": [
                    {"ejemplo": "El paseo del chagra reúne a los mejores jinetes de la serranía con sus ponchos y zamarros.", "contexto": "Tradición ecuestre"}
                ]
            },
            {
                "nombre": "cuyada",
                "descripcion": "Comida festiva o evento comunitario andino cuyo plato estelar es el cuy asado con papas. Fuente: Tradición Gastronómica Andina.",
                "region": "Sierra / Loja / Chimborazo",
                "significados": ["Reunión o banquete popular donde se degusta cuy asado con papas y salsa de maní."],
                "ejemplos": [
                    {"ejemplo": "Los comuneros organizaron una cuyada para recaudar fondos para la capilla del barrio.", "contexto": "Comunitario / Festivo"}
                ]
            },
            {
                "nombre": "repe",
                "descripcion": "Sopa emblemática lojana elaborada con guineo verde molido, leche, quesillo y culantro. Fuente: Patrimonio Gastronómico de Loja.",
                "region": "Sierra / Loja",
                "significados": ["Sopa tradicional lojana a base de plátano verde (guineo) y quesillo."],
                "ejemplos": [
                    {"ejemplo": "En Loja nos sirvieron un exquisito plato de repe lojano con aguacate.", "contexto": "Gastronomía tradicional"}
                ]
            },
            {
                "nombre": "chigüil",
                "descripcion": "Envuelto típico de harina de maíz rellena de queso en hoja tierna de choclo, tradicional del carnaval de Guaranda. Fuente: Patrimonio Gastronómico de Bolívar.",
                "region": "Sierra / Bolívar",
                "significados": ["Bocadillo tradicional envuelto en hoja de maíz, típico de la provincia de Bolívar."],
                "ejemplos": [
                    {"ejemplo": "En las fiestas del carnaval de Guaranda nos convidaron chigüiles recién salidos de la olla.", "contexto": "Festivo / Gastronómico"}
                ]
            },
            {
                "nombre": "coche",
                "descripcion": "Denominación dialectal para el cerdo o chancho en el norte andino ecuatoriano. Fuente: Vocabulario Dialectal del Norte del Ecuador.",
                "region": "Sierra / Carchi / Imbabura",
                "significados": ["Cerdo o chancho en el habla coloquial de la provincia del Carchi."],
                "ejemplos": [
                    {"ejemplo": "El domingo hubo feria ganadera y vendieron varios coches para las festividades.", "contexto": "Agropecuario / Coloquial"}
                ]
            },
            {
                "nombre": "cutul",
                "descripcion": "Hoja tierna que recubre la mazorca de choclo, empleada para envolver humitas. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra",
                "significados": ["Hoja fresca de choclo usada en la envoltura de comidas tradicionales."],
                "ejemplos": [
                    {"ejemplo": "Pelaron los choclos con cuidado para guardar el cutul para las humitas de la tarde.", "contexto": "Culinario doméstico"}
                ]
            },
            {
                "nombre": "shungo",
                "descripcion": "Voz kichwa ('shungu'=corazón o entraña) para aludir al corazón, ánimo o centro de los afectos. Fuente: Diccionario Kichwa-Castellano.",
                "region": "Sierra",
                "significados": ["Corazón, centro emocional o persona muy querida en el habla andina."],
                "ejemplos": [
                    {"ejemplo": "Le dijo a su hijo que era el dueño de todo su shungo.", "contexto": "Afectivo / Familiar"}
                ]
            },
            {
                "nombre": "guando",
                "descripcion": "Camilla rústica o parihuela de madera para trasladar enfermos o bultos por caminos de herradura. Fuente: Tradición Histórica del Carchi.",
                "region": "Sierra / Carchi",
                "significados": ["Camilla tradicional de madera usada para el transporte peatonal de personas o cargas."],
                "ejemplos": [
                    {"ejemplo": "En los senderos antiguos del páramo transportaban a los heridos en un guando de madera.", "contexto": "Histórico / Rural"}
                ]
            },
            {
                "nombre": "al pelo",
                "descripcion": "Locución adverbial que denota que algo calza a la perfección, sale exacto o resulta idóneo. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional",
                "significados": ["Expresión que indica que algo quedó excelente, perfecto o a la medida."],
                "ejemplos": [
                    {"ejemplo": "El horario de clases me quedó al pelo con mi turno de trabajo.", "contexto": "Cotidiano"}
                ]
            },
            {
                "nombre": "al tiro",
                "descripcion": "Locución adverbial para señalar inmediatez, rapidez o prontitud. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional",
                "significados": ["Hacer algo de forma rápida, inmediata o sin demora."],
                "ejemplos": [
                    {"ejemplo": "Apenas me llamaron salí al tiro para la oficina a solucionar el problema.", "contexto": "Informal / Amigos"}
                ]
            },
            {
                "nombre": "chiroque",
                "descripcion": "Pájaro andino cantor de plumaje amarillo y pardo que habita en valles interandinos. Fuente: Fauna y Vocabulario Popular del Carchi.",
                "region": "Sierra / Carchi",
                "significados": ["Ave pequeña de plumaje vistoso y canto agradable en los campos norteños."],
                "ejemplos": [
                    {"ejemplo": "Temprano por la mañana los chiroques cantaban alegres sobre los sauces del río.", "contexto": "Naturaleza / Cotidiano"}
                ]
            },
            {
                "nombre": "achachayay",
                "descripcion": "Forma enfática y superlativa de achachay para acentuar el frío extremo del páramo. Fuente: Habla Popular del Carchi.",
                "region": "Sierra / Carchi",
                "significados": ["Exclamación enfática para manifestar un frío congelante o penetrante."],
                "ejemplos": [
                    {"ejemplo": "¡Achachayay! El viento que baja de la cordillera en Tulcán hiela los huesos.", "contexto": "Climático / Exclamación"}
                ]
            },
            {
                "nombre": "llucho / estar llucho",
                "descripcion": "Voz kichwa ('lluchu'=desnudo, pelado) para indicar desnudez o falta de ropa. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra",
                "significados": ["Persona que está desvestida, desnuda o sin abrigo."],
                "ejemplos": [
                    {"ejemplo": "El niño salió llucho del baño corriendo hacia el cuarto a buscar su ropa.", "contexto": "Familiar / Coloquial"}
                ]
            },
            {
                "nombre": "morocho",
                "descripcion": "Bebida espesa dulce de maíz blanco quebrado cocido con leche, canela y pasas. Fuente: Patrimonio Culinario Ecuatoriano.",
                "region": "Sierra / Nacional",
                "significados": ["Bebida tradicional andina a base de maíz blanco dulce con leche y canela."],
                "ejemplos": [
                    {"ejemplo": "En la noche nos tomamos un morocho bien caliente con una empanada de viento.", "contexto": "Gastronomía popular"}
                ]
            },
            {
                "nombre": "empanada de viento",
                "descripcion": "Empanada frita grande rellena de queso que se infla al freírse y se sirve espolvoreada con azúcar. Fuente: Gastronomía Popular Ecuatoriana.",
                "region": "Nacional",
                "significados": ["Empanada frita inflada y crujiente rellena de queso, servida con café."],
                "ejemplos": [
                    {"ejemplo": "Pedimos dos empanadas de viento con café pasado para la merienda.", "contexto": "Tradición culinaria"}
                ]
            },
            {
                "nombre": "canelazo",
                "descripcion": "Bebida caliente andina elaborada con agua de canela, jugo de naranjilla y aguardiente de caña. Fuente: Patrimonio Inmaterial del Ecuador.",
                "region": "Sierra / Nacional",
                "significados": ["Bebida caliente tradicional con licor de caña y canela, consumida en fiestas serranas."],
                "ejemplos": [
                    {"ejemplo": "En las fiestas de diciembre la gente combate el frío brindando canelazos calientes.", "contexto": "Festivo tradicional"}
                ]
            },
            {
                "nombre": "puntas",
                "descripcion": "Aguardiente artesanal de alta graduación obtenido de la primera destilación de la caña de azúcar. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Sierra / Nacional",
                "significados": ["Aguardiente artesanal destilado de la caña de azúcar."],
                "ejemplos": [
                    {"ejemplo": "El abuelo compró una botella de puntas puras en el trapiche artesanal.", "contexto": "Tradición campesina"}
                ]
            },
            {
                "nombre": "cevichocho",
                "descripcion": "Plato callejero tradicional serrano elaborado con chochos andinos, cuero de cerdo, tostado y salsa de cebolla con tomate. Fuente: Gastronomía Popular Andina.",
                "region": "Sierra",
                "significados": ["Comida popular andina a base de chochos, tostado, cuero y curtido de cebolla."],
                "ejemplos": [
                    {"ejemplo": "A la salida de la universidad los estudiantes suelen comerse un cevichocho completo.", "contexto": "Urbano estudiantil"}
                ]
            },

            # ==========================================
            # COSTA (Guayas, Manabí, Esmeraldas, El Oro, Los Ríos, Santa Elena)
            # ==========================================
            {
                "nombre": "chiro / estar chiro",
                "descripcion": "Estado de carencia temporal de dinero en efectivo o recursos económicos. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional / Costa",
                "significados": ["Persona que no tiene dinero o pasa por escasez económica momentánea."],
                "ejemplos": [
                    {"ejemplo": "Ñaño, estoy completamente chiro, préstame para el pasaje del bus.", "contexto": "Cotidiano informal"}
                ]
            },
            {
                "nombre": "caleta",
                "descripcion": "Vivienda, casa, residencia u hogar de una persona en la jerga urbana costeña. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Costa / Urbana",
                "significados": ["Casa o vivienda de una persona en la jerga coloquial."],
                "ejemplos": [
                    {"ejemplo": "Terminemos el trabajo de la facultad en mi caleta con calma.", "contexto": "Juvenil / Amigos"}
                ]
            },
            {
                "nombre": "aniñado / aniñada",
                "descripcion": "Persona adinerada, de clase social acomodada o que hace ostentación de bienes. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional / Costa",
                "significados": ["Persona adinerada, pudiente o que presume de lujos."],
                "ejemplos": [
                    {"ejemplo": "Ese barrio es muy aniñado, todas las casas son modernas y vigiladas.", "contexto": "Social / Descriptivo"}
                ]
            },
            {
                "nombre": "camello",
                "descripcion": "Trabajo, empleo, ocupación remunerada o labor cotidiana en el léxico popular. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional / Costa",
                "significados": ["Trabajo, empleo, ocupación o labor que genera ingresos."],
                "ejemplos": [
                    {"ejemplo": "Necesito conseguir camello urgente para ayudar a pagar los gastos de mi casa.", "contexto": "Laboral / Cotidiano"}
                ]
            },
            {
                "nombre": "pelado / pelada",
                "descripcion": "Muchacho, joven, novio o enamorada en el lenguaje coloquial costeño y nacional. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional / Costa",
                "significados": ["Joven, muchacho, novio o enamorada en tono cercano y familiar."],
                "ejemplos": [
                    {"ejemplo": "El pelado aprobó todas las materias del semestre con felicitaciones.", "contexto": "Familiar / Amigos"}
                ]
            },
            {
                "nombre": "guayaco / guayaca",
                "descripcion": "Gentilicio popular cariñoso y descriptivo para las personas nacidas en Guayaquil. Fuente: Diccionario de la Lengua Española (RAE).",
                "region": "Costa / Guayas",
                "significados": ["Persona nacida o residente en la ciudad de Guayaquil."],
                "ejemplos": [
                    {"ejemplo": "El guayaco siempre se destaca por su espíritu emprendedor y alegre.", "contexto": "Identidad porteña"}
                ]
            },
            {
                "nombre": "manaba",
                "descripcion": "Gentilicio popular y apelativo de afecto para los originarios de la provincia de Manabí. Fuente: Diccionario de la Lengua Española (RAE).",
                "region": "Costa / Manabí",
                "significados": ["Persona originaria o habitante de la provincia de Manabí."],
                "ejemplos": [
                    {"ejemplo": "La comida manaba es famosa en todo el país por su exquisito sazón con maní y mariscos.", "contexto": "Cultural / Gastronómico"}
                ]
            },
            {
                "nombre": "esmeraldeño / esmeraldeña",
                "descripcion": "Persona oriunda de Esmeraldas, destacada por su herencia afroecuatoriana, danza y música de marimba. Fuente: Diccionario RAE.",
                "region": "Costa / Esmeraldas",
                "significados": ["Persona originaria de la provincia de Esmeraldas."],
                "ejemplos": [
                    {"ejemplo": "El pueblo esmeraldeño guarda una riqueza cultural única en sus cantos de marimba.", "contexto": "Afroecuatoriano / Cultural"}
                ]
            },
            {
                "nombre": "lamparear",
                "descripcion": "Alardear, presumir, fantasear o aparentar posesiones o virtudes para impresionar a otros. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Costa / Urbana",
                "significados": ["Alardear o aparentar tener más dinero, estatus o importancia de la que se tiene."],
                "ejemplos": [
                    {"ejemplo": "Deja de lamparear con cosas prestadas y habla con la verdad.", "contexto": "Informal callejero"}
                ]
            },
            {
                "nombre": "hacer la casita",
                "descripcion": "Traicionar la confianza, tender una trampa laboral o conspirar a espaldas de alguien. Fuente: Habla Popular de Guayaquil.",
                "region": "Costa / Urbana",
                "significados": ["Tender una trampa, jugar chueco o conspirar contra otra persona."],
                "ejemplos": [
                    {"ejemplo": "Ten cuidado con ese compañero porque te puede hacer la casita en el departamento.", "contexto": "Laboral / Alerta"}
                ]
            },
            {
                "nombre": "biela",
                "descripcion": "Denominación coloquial e informal para la cerveza. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional / Costa",
                "significados": ["Cerveza en el lenguaje coloquial ecuatoriano."],
                "ejemplos": [
                    {"ejemplo": "Hacía tanto calor que nos tomamos una biela bien helada junto al río.", "contexto": "Amigos / Informal"}
                ]
            },
            {
                "nombre": "jama",
                "descripcion": "Comida, alimento o plato preparado en la jerga informal costeña. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional / Costa",
                "significados": ["Comida, almuerzo o alimento servido para comer."],
                "ejemplos": [
                    {"ejemplo": "En ese restaurante la jama es abundante, deliciosa y económica.", "contexto": "Cotidiano informal"}
                ]
            },
            {
                "nombre": "encebollado",
                "descripcion": "Sopa insignia de la gastronomía ecuatoriana a base de albacora, yuca, cebolla morada curtida y cilantro. Fuente: Patrimonio Cultural y Culinario del Ecuador.",
                "region": "Nacional / Costa",
                "significados": ["Sopa caliente costeña de pescado (albacora) con yuca cocida y cebolla curtida."],
                "ejemplos": [
                    {"ejemplo": "El fin de semana salimos en familia a desayunar encebollado mixto con chifles.", "contexto": "Plato nacional"}
                ]
            },
            {
                "nombre": "chifle",
                "descripcion": "Rebanada fina y crujiente de plátano verde frito, guarnición clásica de la mesa ecuatoriana. Fuente: Diccionario de la Lengua Española (RAE).",
                "region": "Nacional / Costa",
                "significados": ["Tira o rodaja frita y crocante de plátano verde."],
                "ejemplos": [
                    {"ejemplo": "El ceviche y el encebollado no están completos sin una buena porción de chifles.", "contexto": "Gastronomía"}
                ]
            },
            {
                "nombre": "ruco / estar ruco",
                "descripcion": "Estar profundamente dormido o persona anciana en tono familiar afectivo. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional / Costa",
                "significados": ["Persona dormida o rendida por el sueño."],
                "ejemplos": [
                    {"ejemplo": "El viaje fue tan largo que mi hermano llegó y se quedó ruco al instante.", "contexto": "Familiar / Descanso"}
                ]
            },
            {
                "nombre": "pateperro",
                "descripcion": "Persona callejera, andariega o inquieta que pasa fuera de su casa la mayor parte del tiempo. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Costa / Manabí",
                "significados": ["Persona callejera que gusta de viajar o salir constantemente de su casa."],
                "ejemplos": [
                    {"ejemplo": "A ese muchacho le dicen pateperro porque nunca lo encuentran en casa.", "contexto": "Familiar humorístico"}
                ]
            },
            {
                "nombre": "muco / estar muco",
                "descripcion": "Animal desprovisto de astas o persona sin dientes frontales en el habla montubia. Fuente: Habla Popular Manabita.",
                "region": "Costa / Manabí",
                "significados": ["Animal sin cuernos o persona a la que le falta una pieza dental."],
                "ejemplos": [
                    {"ejemplo": "En el corral tenían una ternera muca pastando plácidamente.", "contexto": "Rural montubio"}
                ]
            },
            {
                "nombre": "caderona",
                "descripcion": "Baile y canción folclórica tradicional de la comunidad afroesmeraldeña al ritmo de marimba y bombo. Fuente: Patrimonio Cultural Afroecuatoriano.",
                "region": "Costa / Esmeraldas",
                "significados": ["Danza tradicional esmeraldeña de ritmo cadencioso interpretada con marimba."],
                "ejemplos": [
                    {"ejemplo": "El grupo de danza afroecuatoriana presentó una coreografía magistral de la caderona.", "contexto": "Danza ancestral"}
                ]
            },
            {
                "nombre": "corviche",
                "descripcion": "Masa frita de plátano verde rallado y pasta de maní rellena con pescado sazonado; bocadillo costero insignia. Fuente: Patrimonio Gastronómico Manabita.",
                "region": "Costa / Manabí",
                "significados": ["Bocadillo típico manabita a base de verde, maní y pescado frito."],
                "ejemplos": [
                    {"ejemplo": "Desayunamos un corviche caliente con ají criollo en el malecón de Portoviejo.", "contexto": "Gastronomía costeña"}
                ]
            },
            {
                "nombre": "tonga",
                "descripcion": "Almuerzo campesino manabita envuelto en hoja de plátano amortiguada; lleva arroz, seco de gallina y salsa de maní. Fuente: Patrimonio Culinario Manabita.",
                "region": "Costa / Manabí",
                "significados": ["Envuelto tradicional montubio en hoja de plátano con arroz, pollo y pasta de maní."],
                "ejemplos": [
                    {"ejemplo": "Para las faenas en el campo la abuela preparaba tongas de gallina criolla bien jugosas.", "contexto": "Montubio tradicional"}
                ]
            },
            {
                "nombre": "bolón",
                "descripcion": "Bola compacta de plátano verde frito y majado combinada con queso manaba, chicharrón o ambos (mixto). Fuente: Diccionario Gastronómico Ecuatoriano.",
                "region": "Nacional / Costa",
                "significados": ["Bola de plátano verde majado con queso o chicharrón, desayuno típico ecuatoriano."],
                "ejemplos": [
                    {"ejemplo": "Pidamos un bolón mixto con huevo frito y una taza de café caliente.", "contexto": "Desayuno popular"}
                ]
            },
            {
                "nombre": "maduro con queso",
                "descripcion": "Plátano maduro asado al carbón y abierto por la mitad para colocar queso criollo derretido. Fuente: Tradición Gastronómica Nacional.",
                "region": "Nacional / Costa",
                "significados": ["Plátano maduro asado relleno de queso derretido, comida callejera tradicional."],
                "ejemplos": [
                    {"ejemplo": "En la carretera compramos maduros con queso asados al carbón que olían delicioso.", "contexto": "Gastronomía al paso"}
                ]
            },
            {
                "nombre": "tigrillo",
                "descripcion": "Plato típico de Zaruma (El Oro) a base de plátano verde majado en sartén con huevo, queso y refrito criollo. Fuente: Patrimonio Cultural Inmaterial del Ecuador.",
                "region": "Costa / El Oro",
                "significados": ["Plato tradicional de Zaruma compuesto de verde majado con huevo revuelto y queso."],
                "ejemplos": [
                    {"ejemplo": "El tigrillo zarumeño acompañado de café de altura es el orgullo de la provincia de El Oro.", "contexto": "Gastronomía orense"}
                ]
            },
            {
                "nombre": "trolo",
                "descripcion": "Persona ingenua, distraída o que cae con facilidad en engaños o bromas pesadas. Fuente: Jerga Urbana de Guayaquil.",
                "region": "Costa / Urbana",
                "significados": ["Persona despistada, cándida o fácil de engañar."],
                "ejemplos": [
                    {"ejemplo": "No seas trolo y revisa bien el contrato antes de firmar cualquier documento.", "contexto": "Informal juvenil"}
                ]
            },
            {
                "nombre": "tirar pana",
                "descripcion": "Ostentar elegancia, vestimenta nueva o presumir de comodidades de manera airosa. Fuente: Habla Popular Porteña.",
                "region": "Costa / Urbana",
                "significados": ["Presumir estilo, porte o vestimenta llamativa ante los demás."],
                "ejemplos": [
                    {"ejemplo": "Llegó al malecón estrenando zapatos nuevos para tirar pana con los amigos.", "contexto": "Urbano porteño"}
                ]
            },

            # ==========================================
            # AMAZONÍA (Napo, Pastaza, Sucumbíos, Orellana, Morona Santiago, Zamora Chinchipe)
            # ==========================================
            {
                "nombre": "guayusa",
                "descripcion": "Planta amazónica (Ilex guayusa) cuyas hojas hervidas forman una infusión energizante y ritual matutina. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Amazonía",
                "significados": ["Planta sagrada amazónica e infusión estimulante y ritual matutina."],
                "ejemplos": [
                    {"ejemplo": "En la madrugada la comunidad se reunió a tomar guayusa caliente y planificar el día.", "contexto": "Tradición indígena amazónica"}
                ]
            },
            {
                "nombre": "maito",
                "descripcion": "Pescado de río (bagre, tilapia o carachama) envuelto en hojas de bijao y asado lentamente al carbón. Fuente: Patrimonio Culinario Amazónico.",
                "region": "Amazonía",
                "significados": ["Plato tradicional amazónico de pescado envuelto en hojas de bijao y asado a las brasas."],
                "ejemplos": [
                    {"ejemplo": "En el mercado de Tena almorzamos maito de tilapia con yuca cocida y palmito.", "contexto": "Gastronomía amazónica"}
                ]
            },
            {
                "nombre": "chonta",
                "descripcion": "Palmera amazónica (Bactris gasipaes) de madera flexible y resistente, cuyo fruto carnoso y nutritivo es el chontaduro. Fuente: Diccionario de la Lengua Española (RAE).",
                "region": "Amazonía",
                "significados": ["Palmera selvática de fruto comestible y madera empleada en lanzas y artesanías."],
                "ejemplos": [
                    {"ejemplo": "En la fiesta de la chonta las familias agradecen por la abundancia de las cosechas.", "contexto": "Ancestral / Festivo"}
                ]
            },
            {
                "nombre": "curaca",
                "descripcion": "Líder ancestral, cacique o máxima autoridad moral y política en comunidades indígenas amazónicas y andinas. Fuente: Diccionario de la Lengua Española (RAE).",
                "region": "Amazonía / Sierra",
                "significados": ["Jefe o autoridad tradicional comunitaria indígena."],
                "ejemplos": [
                    {"ejemplo": "El curaca escuchó con atención las peticiones de los habitantes antes de tomar una decisión.", "contexto": "Organización comunitaria"}
                ]
            },
            {
                "nombre": "yaku",
                "descripcion": "Término kichwa para el agua limpia, vertiente natural o curso fluvial puro. Fuente: Lengua y Cosmovisión Kichwa.",
                "region": "Amazonía / Sierra",
                "significados": ["Agua cristalina, río o vertiente hídrica en lengua originaria."],
                "ejemplos": [
                    {"ejemplo": "Los niños se refrescaron en el yaku transparente que desciende de la montaña.", "contexto": "Naturaleza / Kichwa"}
                ]
            },
            {
                "nombre": "ayahuasca",
                "descripcion": "Planta medicinal y brebaje ancestral amazónico preparado por taitas o chamanes para ceremonias espirituales. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Amazonía",
                "significados": ["Brebaje tradicional amazónico empleado en rituales de sanación y visión espiritual."],
                "ejemplos": [
                    {"ejemplo": "El sabio curandero dirigió una ceremonia tradicional con ayahuasca en la selva profunda.", "contexto": "Medicina ancestral"}
                ]
            },
            {
                "nombre": "chicha de yuca",
                "descripcion": "Bebida fermentada milenaria elaborada por mujeres amazónicas mediante el machacado de yuca cocida. Fuente: Sabiduría y Alimentación Amazónica.",
                "region": "Amazonía",
                "significados": ["Bebida tradicional fermentada a base de yuca hervida y macerada."],
                "ejemplos": [
                    {"ejemplo": "Como símbolo de hospitalidad nos brindaron un pilche con chicha de yuca fresca.", "contexto": "Comunitario tradicional"}
                ]
            },
            {
                "nombre": "bijao",
                "descripcion": "Planta de hojas amplias y flexibles (Heliconia) empleadas en toda la Amazonía y Costa para envolver alimentos cocidos al vapor o a las brasas. Fuente: Botánica y Etnocultura del Ecuador.",
                "region": "Amazonía / Costa",
                "significados": ["Hoja grande y resistente utilizada en la envoltura y cocción de platos tradicionales."],
                "ejemplos": [
                    {"ejemplo": "Cortaron hojas frescas de bijao para envolver los pescados antes de colocarlos al fogón.", "contexto": "Cocina ancestral"}
                ]
            },
            {
                "nombre": "guanta",
                "descripcion": "Roedor silvestre de gran tamaño (Cuniculus paca) de carne muy apetecida en la gastronomía rural amazónica y costera. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Amazonía / Costa",
                "significados": ["Mamífero roedor silvestre característico de la selva y bosques tropicales ecuatorianos."],
                "ejemplos": [
                    {"ejemplo": "En la reserva biológica pudimos fotografiar una guanta alimentándose de frutos silvestres.", "contexto": "Fauna tropical"}
                ]
            },

            # ==========================================
            # NACIONAL Y JERGAS POPULARES URBANAS
            # ==========================================
            {
                "nombre": "minga",
                "descripcion": "Institución andina milenaria de trabajo colectivo voluntario y solidario en beneficio de la comunidad (kichwa 'mink'a'). Fuente: Diccionario de la Lengua Española (RAE).",
                "region": "Nacional",
                "significados": ["Trabajo colectivo no remunerado que une a la comunidad para realizar obras de bien común."],
                "ejemplos": [
                    {"ejemplo": "Todo el barrio participó en la minga dominical para limpiar la quebrada y pintar la casa comunal.", "contexto": "Comunitario solidario"}
                ]
            },
            {
                "nombre": "chapa",
                "descripcion": "Término de la jerga popular urbana para referirse a los agentes de policía o de tránsito. Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional / Jerga",
                "significados": ["Policía o miembro de la fuerza del orden público en el habla coloquial ecuatoriana."],
                "ejemplos": [
                    {"ejemplo": "Había un chapa dirigiendo el tránsito en la avenida principal porque el semáforo se dañó.", "contexto": "Urbano cotidiano"}
                ]
            },
            {
                "nombre": "foco / qué foco",
                "descripcion": "Situación que provoca vergüenza, bochorno o ridículo público. Fuente: Habla Popular Urbana del Ecuador.",
                "region": "Nacional / Jerga",
                "significados": ["Situación vergonzosa, ridícula o bochornosa que expone a una persona ante los demás."],
                "ejemplos": [
                    {"ejemplo": "¡Qué foco que se me cayera la mochila en medio del escenario durante la exposición!", "contexto": "Juvenil / Descriptivo"}
                ]
            },
            {
                "nombre": "lámpara / qué lámpara",
                "descripcion": "Acción aparatosa, llamativa o exagerada que no coincide con la realidad; alardear de forma falsa. Fuente: Jerga Juvenil Ecuatoriana.",
                "region": "Nacional / Jerga",
                "significados": ["Situación exagerada, llamativa o engañosa destinada a aparentar algo irreal."],
                "ejemplos": [
                    {"ejemplo": "No seas lámpara inventando historias que nadie te cree.", "contexto": "Coloquial juvenil"}
                ]
            },
            {
                "nombre": "hacer la vaca",
                "descripcion": "Colecta voluntaria de dinero entre amigos o compañeros para solventar un gasto común (comida, fiesta, compra). Fuente: Diccionario de Americanismos (ASALE).",
                "region": "Nacional",
                "significados": ["Juntar dinero entre varias personas para comprar algo compartido."],
                "ejemplos": [
                    {"ejemplo": "Hagamos una vaca entre todos para comprar los refrescos y las pizzas de la tarde.", "contexto": "Amigos / Estudiantes"}
                ]
            },
            {
                "nombre": "cuchara de palo",
                "descripcion": "Utensilio tradicional tallado de madera o metáfora popular aplicada a personas que se entrometen en conversaciones ajenas. Fuente: Refranero Popular Ecuatoriano.",
                "region": "Nacional",
                "significados": ["Utensilio tradicional de cocina andina o dicho para quien interviene sin ser invitado."],
                "ejemplos": [
                    {"ejemplo": "El locro de papas siempre se revuelve con cuchara de palo para conservar su textura tradicional.", "contexto": "Cocina y refranes"}
                ]
            },
            {
                "nombre": "hacer casita",
                "descripcion": "Acomodarse astutamente o preparar una emboscada o sorpresa desfavorable a alguien. Fuente: Habla Popular Urbana.",
                "region": "Nacional",
                "significados": ["Maniobrar a espaldas de otro para perjudicarlo o sacar provecho personal."],
                "ejemplos": [
                    {"ejemplo": "Debes estar atento a los trámites para que no te hagan casita con los turnos de entrega.", "contexto": "Urbano cotidiano"}
                ]
            }
        ]

        nuevos_creados = 0
        ya_existentes = 0

        for item in nuevos_modismos:
            modismo, created = Modismo.objects.get_or_create(
                nombre_modismo=item["nombre"],
                defaults={
                    "descripcion": item["descripcion"],
                    "region": item["region"],
                    "estado": "Activo"
                }
            )
            if created:
                nuevos_creados += 1
                for sig in item["significados"]:
                    Significado.objects.get_or_create(modismo=modismo, significado=sig)
                for ej in item["ejemplos"]:
                    EjemploUso.objects.get_or_create(modismo=modismo, ejemplo=ej["ejemplo"], contexto=ej["contexto"])
            else:
                ya_existentes += 1

        total_final = Modismo.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'Ampliación completada: {nuevos_creados} nuevos modismos registrados. '
            f'Ya existentes: {ya_existentes}. Total en base de datos: {total_final}.'
        ))

