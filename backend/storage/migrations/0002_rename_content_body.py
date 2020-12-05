from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('storage', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='document',
            old_name='content',
            new_name='body',
        ),
    ]
