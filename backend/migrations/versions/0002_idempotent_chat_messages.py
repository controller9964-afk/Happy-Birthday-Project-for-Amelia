"""Add client message IDs for idempotent WebSocket sends."""

from alembic import op
import sqlalchemy as sa

revision = "0002_idempotent_chat_messages"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "messages",
        sa.Column("client_message_id", sa.String(length=36), nullable=True),
    )
    op.create_unique_constraint(
        "uq_messages_client_message",
        "messages",
        ["client_id", "client_message_id"],
    )


def downgrade():
    op.drop_constraint("uq_messages_client_message", "messages", type_="unique")
    op.drop_column("messages", "client_message_id")
