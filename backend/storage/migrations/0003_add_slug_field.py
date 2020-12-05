from django.conf import settings
import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('storage', '0002_rename_content_body'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='slug',
            field=models.CharField(default='a', max_length=200, validators=[django.core.validators.RegexValidator(message='Slug can only contain lower case letters, numbers or `-`.', regex='^[-a-z0-9]+$')]),
            preserve_default=False,
        ),
        migrations.AlterUniqueTogether(
            name='document',
            unique_together={('user', 'slug')},
        ),
    ]
