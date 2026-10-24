from django.db import migrations, models
import django.db.models.deletion


def agrupar_consultas_existentes(apps, schema_editor):
    Conversacion = apps.get_model('asistente', 'Conversacion')
    Consulta = apps.get_model('asistente', 'Consulta')
    for consulta in Consulta.objects.all().iterator():
        titulo = consulta.texto_consulta.strip()[:120] or 'Conversación sin título'
        conversacion = Conversacion.objects.create(
            usuario_id=consulta.usuario_id,
            titulo=titulo,
        )
        consulta.conversacion_id = conversacion.id_conversacion
        consulta.save(update_fields=['conversacion'])


class Migration(migrations.Migration):
    dependencies = [('asistente', '0002_initial')]

    operations = [
        migrations.CreateModel(
            name='Conversacion',
            fields=[
                ('id_conversacion', models.AutoField(primary_key=True, serialize=False)),
                ('titulo', models.CharField(default='Nueva conversación', max_length=120)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('usuario', models.ForeignKey(db_column='id_usuario', on_delete=django.db.models.deletion.CASCADE, related_name='conversaciones', to='authentication.usuario')),
            ],
            options={'db_table': 'conversaciones', 'ordering': ['-fecha_actualizacion']},
        ),
        migrations.AddField(
            model_name='consulta', name='conversacion',
            field=models.ForeignKey(null=True, db_column='id_conversacion', on_delete=django.db.models.deletion.CASCADE, related_name='consultas', to='asistente.conversacion'),
        ),
        migrations.RunPython(agrupar_consultas_existentes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='consulta', name='conversacion',
            field=models.ForeignKey(db_column='id_conversacion', on_delete=django.db.models.deletion.CASCADE, related_name='consultas', to='asistente.conversacion'),
        ),
    ]
