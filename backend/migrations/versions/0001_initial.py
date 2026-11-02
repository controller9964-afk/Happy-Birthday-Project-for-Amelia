"""Create wishes, chat messages, reports, and mutes."""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("nickname", sa.String(length=24), nullable=False),
        sa.Column("content", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_messages_client_id", "messages", ["client_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])
    op.create_table(
        "chat_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("message_id", sa.Integer(), sa.ForeignKey("messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.String(length=280), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chat_reports_message_id", "chat_reports", ["message_id"])
    op.create_table(
        "chat_mutes",
        sa.Column("client_id", sa.String(length=64), primary_key=True),
        sa.Column("muted_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=280), nullable=False),
    )
    op.create_table(
        "wishes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nickname", sa.String(length=40), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_wishes_created_at", "wishes", ["created_at"])


def downgrade():
    op.drop_index("ix_wishes_created_at", table_name="wishes")
    op.drop_table("wishes")
    op.drop_table("chat_mutes")
    op.drop_index("ix_chat_reports_message_id", table_name="chat_reports")
    op.drop_table("chat_reports")
    op.drop_index("ix_messages_created_at", table_name="messages")
    op.drop_index("ix_messages_client_id", table_name="messages")
    op.drop_table("messages")
