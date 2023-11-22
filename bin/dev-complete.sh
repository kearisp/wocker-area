#!/bin/bash

OPTIONS="option1\ with\ space
option\ with\ space
option3\ with\ space"

cur=""
COMP_LINE=""
COMP_WORDS=("ws" "mariadb:restore" "kp" "\"2023-0")
COMP_CWORD=5

RES=""

for i in "${COMP_WORDS[@]}"; do
    cur=$i

    if [[ $RES == "" ]]; then
        RES="\"$i\""
        COMP_LINE="$i"
    else
        RES="$RES, \"$i\""
        COMP_LINE="$COMP_LINE $i"
    fi
done

nb_colon=$(grep -o ":" <<< "$COMP_LINE" | wc -l)

OPTIONS=$(ws --compbash --compgen "$((COMP_CWORD - (nb_colon * 2)))" "$COMP_CWORD" "$COMP_LINE")

echo "($RES)"

COMPREPLY=()
STR=$(compgen -W "${OPTIONS}" -- $cur)

while IFS= read -r line; do
    if [[ $cur != "'"* && $cur != "\""* ]]; then
        line=$(echo ${line} | sed 's/ /\\ /g')
    else
        line="\"$line\""
    fi

    COMPREPLY+=("$line")
done <<< "$STR"

for (( i = 0; i < ${#COMPREPLY[@]}; i++ )); do
    echo "> ${COMPREPLY[$i]}"
done