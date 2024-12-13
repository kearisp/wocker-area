#!/bin/bash

# Перевіряємо чи є активна D-Bus сесія
if [ -z "$DBUS_SESSION_BUS_ADDRESS" ]; then
  echo "🔐 Запускаємо нову D-Bus сесію..."
  eval $(dbus-launch --sh-syntax)
else
  echo "✅ D-Bus сесія вже активна."
fi

# Перевіряємо чи запущено gnome-keyring-daemon
if ! pgrep -x "gnome-keyring-daemon" > /dev/null; then
  echo "🔐 Запускаємо gnome-keyring-daemon..."
  eval $(gnome-keyring-daemon --start)
else
  echo "✅ gnome-keyring-daemon вже працює."
fi

# Показати фінальний статус
echo ""
echo "🔑  D-Bus адреса: $DBUS_SESSION_BUS_ADDRESS"
echo "🗝️ SSH_AUTH_SOCK: $SSH_AUTH_SOCK"
echo "✅ Keyring оточення готове."
