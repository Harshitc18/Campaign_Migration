from moengage.platform.loggers import Treysor


class MigrationTreysor(Treysor):
    def __init__(self):
        super(MigrationTreysor, self)\
                .__init__('CTOoffice.migration.treysor')