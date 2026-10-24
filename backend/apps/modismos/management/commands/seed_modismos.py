from django.core.management.base import BaseCommand
from apps.modismos.models import Modismo, Significado, EjemploUso

class Command(BaseCommand):
    help = 'Puebla la base de datos con los modismos ecuatorianos del estudio de tesis UPEC'

    def handle(self, *args, **options):
        modismos_data = [
            {
                "nombre": "guambra",
                "descripcion": "Término de origen kichwa para referirse a una persona joven.",
                "region": "Sierra / Ecuador",
                "significados": ["Niño, niña, adolescente o joven, según el contexto."],
                "ejemplos": [
                    {"ejemplo": "Los guambras salieron a jugar en el parque.", "contexto": "Familiar / Cotidiano"}
                ]
            },
            {
                "nombre": "¡achachay!",
                "descripcion": "Expresión de origen kichwa para manifestar frío extremo.",
                "region": "Sierra / Carchi",
                "significados": ["Palabra que se utiliza para referirse a que la persona experimenta demasiado frío."],
                "ejemplos": [
                    {"ejemplo": "¡achachay! el viento de Tulcán me está congelando.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "¡chulla vida!",
                "descripcion": "Filosofía popular ecuatoriana sobre disfrutar el presente.",
                "region": "Sierra / Pichincha",
                "significados": ["Significa que solo hay una vida y hay que disfrutarla al máximo."],
                "ejemplos": [
                    {"ejemplo": "Me voy a ir de viaje todo el fin de semana con mis amigos, total, ¡es chulla vida!", "contexto": "Familiar / Amigos"}
                ]
            },
            {
                "nombre": "¡chuta!",
                "descripcion": "Exclamación de contrariedad, sorpresa o frustración.",
                "region": "Nacional / Sierra",
                "significados": ["Expresa sorpresa, frustración, enojo o lástima, similar a decir 'rayos' o 'diablos'."],
                "ejemplos": [
                    {"ejemplo": "Chuta, se me pasó el bus. Chuta mi celular se perdió. ¡chuta!, se quedaron las llaves adentro.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "¡púchica!",
                "descripcion": "Exclamación de admiración o impacto.",
                "region": "Sierra / Carchi",
                "significados": ["Es una expresión que se utiliza para mostrar sorpresa, admiración, preocupación o asombro ante algo."],
                "ejemplos": [
                    {"ejemplo": "Púchica que hambre.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "¿cachas?",
                "descripcion": "Verbo interrogativo para comprobar entendimiento.",
                "region": "Nacional / Urbana",
                "significados": ["Interrogar o preguntar a la persona si entendió un tema en específico, si captó."],
                "ejemplos": [
                    {"ejemplo": "Tuve que cambiar mis horarios de trabajo porque chocaba con mis estudios, ¿cachas?", "contexto": "Académico / Informal"}
                ]
            },
            {
                "nombre": "aquisito nomás",
                "descripcion": "Locución adverbial de cercanía relativa.",
                "region": "Sierra",
                "significados": ["Lugar que queda cerca o a corta distancia, un lugar no muy lejos."],
                "ejemplos": [
                    {"ejemplo": "Vamos a la tienda de aquisito nomás.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "bacán / chévere",
                "descripcion": "Calificativo positivo de uso extendido.",
                "region": "Nacional",
                "significados": ["Algo bueno, bien, bonito o excelente."],
                "ejemplos": [
                    {"ejemplo": "Está chévere ese trabajo que hiciste. Qué bacán tu carro.", "contexto": "Laboral / Social"}
                ]
            },
            {
                "nombre": "cachar",
                "descripcion": "Comprender o asimilar una idea.",
                "region": "Nacional",
                "significados": ["Significado de entender o captar algo."],
                "ejemplos": [
                    {"ejemplo": "No cacho el manual del televisor.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "camellar",
                "descripcion": "Actividad laboral.",
                "region": "Nacional",
                "significados": ["Esta palabra significa cuando una persona debe trabajar o laborar."],
                "ejemplos": [
                    {"ejemplo": "Mi amigo tuvo que camellar todo el día. Me salió un camello en un restaurante.", "contexto": "Laboral"}
                ]
            },
            {
                "nombre": "chuchaqui",
                "descripcion": "Efectos posteriores a la ingesta alcohólica (origen kichwa chaqui).",
                "region": "Nacional",
                "significados": ["Malestar o resaca que siente una persona luego de consumir licor."],
                "ejemplos": [
                    {"ejemplo": "Para que te pase el chuchaqui debes tomar mucha agua. Juan está comiendo encebollado para curar el chuchaqui.", "contexto": "Social / Cotidiano"}
                ]
            },
            {
                "nombre": "de ley",
                "descripcion": "Confirmación certera o aseguramiento.",
                "region": "Nacional",
                "significados": ["Se utiliza como un equivalente a las expresiones por supuesto, sin duda alguna, es una afirmación tajante."],
                "ejemplos": [
                    {"ejemplo": "De ley que vamos a esa fiesta. De ley que vamos a comer en mi casa.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "de una",
                "descripcion": "Acción inmediata sin demora.",
                "region": "Nacional",
                "significados": ["Se refiere a realizar una acción de manera inmediata, vamos, acudir a una invitación sin dudarlo."],
                "ejemplos": [
                    {"ejemplo": "Si salen con el balón de una les caigo. De una vámonos a las cascadas.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "guagua",
                "descripcion": "Término kichwa adoptado para infantes.",
                "region": "Sierra",
                "significados": ["Niño pequeño o bebé."],
                "ejemplos": [
                    {"ejemplo": "La guagua está llorando.", "contexto": "Familiar"}
                ]
            },
            {
                "nombre": "mija",
                "descripcion": "Vocativo cariñoso (contracción de mi hija).",
                "region": "Nacional",
                "significados": ["Se refiere a llamar la atención de un amigo cercano o familiar."],
                "ejemplos": [
                    {"ejemplo": "Mija vamos a comer. Mija, pásame el lápiz porfa.", "contexto": "Familiar"}
                ]
            },
            {
                "nombre": "jamar",
                "descripcion": "Alimentarse.",
                "region": "Urbana / Informal",
                "significados": ["Comer, almorzar o cenar."],
                "ejemplos": [
                    {"ejemplo": "Me voy a la casa que ya está la comida para jamar.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "la plena",
                "descripcion": "Garantía de veracidad.",
                "region": "Nacional",
                "significados": ["Se refiere a un suceso verídico, la pura verdad."],
                "ejemplos": [
                    {"ejemplo": "La plena que estoy ocupado en este momento.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "ñaño / ñaña",
                "descripcion": "Trato fraternal (origen kichwa ñaña/hermana).",
                "region": "Sierra / Nacional",
                "significados": ["Manera de decir hermano, amigo íntimo o conocido con afecto."],
                "ejemplos": [
                    {"ejemplo": "Oye ñaño no seas malito préstame 20 latas. Ñaño ayúdame con esta tarea.", "contexto": "Familiar / Académico"}
                ]
            },
            {
                "nombre": "pana / mashi",
                "descripcion": "Amigo o compañero solidario.",
                "region": "Nacional (mashi en Sierra)",
                "significados": ["Referirse a una persona cuando es amigo muy allegado o colega."],
                "ejemplos": [
                    {"ejemplo": "Mi pana no viene a la casa.", "contexto": "Amigos"}
                ]
            },
            {
                "nombre": "no seas malito",
                "descripcion": "Fórmula tradicional de cortesía serrana para solicitar favores.",
                "region": "Sierra",
                "significados": ["Expresión típica de la sierra ecuatoriana que significa por favor o ten la bondad."],
                "ejemplos": [
                    {"ejemplo": "No seas malito presté dinero.", "contexto": "Conversación informal"}
                ]
            },
            {
                "nombre": "ponte once",
                "descripcion": "Advertencia de agudeza mental.",
                "region": "Nacional",
                "significados": ["Estar atento, pendiente, listo al realizar una acción."],
                "ejemplos": [
                    {"ejemplo": "Va a jugar la selección ponte once. Ponte once ñaño.", "contexto": "Social"}
                ]
            },
            {
                "nombre": "pilas / ponte pilas",
                "descripcion": "Estar despierto, atento o concentrado.",
                "region": "Nacional",
                "significados": ["Persona astuta; llamado a tomar algo en serio y con diligencia."],
                "ejemplos": [
                    {"ejemplo": "Amigo ponte pilas en la lección de mañana. Amigo, está bajo en notas, ponte pilas.", "contexto": "Académico"}
                ]
            },
            {
                "nombre": "veci",
                "descripcion": "Apócope cordial de vecino/a.",
                "region": "Sierra / Pichincha / Carchi",
                "significados": ["Usado habitualmente para llamar o dirigirse de manera respetuosa a una persona o tendero."],
                "ejemplos": [
                    {"ejemplo": "Buenos días veci, ¿en qué le puedo ayudar?", "contexto": "Cotidiano / Comercial"}
                ]
            },
            {
                "nombre": "dar papaya",
                "descripcion": "Exponerse innecesariamente a peligro o desventaja.",
                "region": "Nacional",
                "significados": ["Dar oportunidad o descuidarse en una situación de riesgo."],
                "ejemplos": [
                    {"ejemplo": "No guardes el celular ahí, no des papaya.", "contexto": "Conversación informal"}
                ]
            }
        ]

        count = 0
        for item in modismos_data:
            modismo, created = Modismo.objects.get_or_create(
                nombre_modismo=item["nombre"],
                defaults={
                    "descripcion": item["descripcion"],
                    "region": item["region"],
                    "estado": "Activo"
                }
            )
            for sig in item["significados"]:
                Significado.objects.get_or_create(modismo=modismo, significado=sig)
            for ej in item["ejemplos"]:
                EjemploUso.objects.get_or_create(modismo=modismo, ejemplo=ej["ejemplo"], contexto=ej["contexto"])
            if created:
                count += 1

        self.stdout.write(self.style.SUCCESS(f'Base de datos poblada exitosamente con {len(modismos_data)} modismos ecuatorianos (Nuevos añadidos: {count}).'))
