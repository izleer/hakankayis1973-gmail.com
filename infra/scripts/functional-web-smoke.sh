#!/usr/bin/env bash
# izleer — web duman testleri (Next.js :3000, API :4000)
# Kullanım: bash infra/scripts/functional-web-smoke.sh
set -u

BASE="${WEB_BASE:-http://127.0.0.1:3000}"
JAR="${COOKIE_JAR:-./.web-smoke-cookies.txt}"
PASS=0
FAIL=0
TOTAL=0

check() {
  local id="$1" title="$2" condition="$3"
  TOTAL=$((TOTAL + 1))
  if eval "$condition"; then
    PASS=$((PASS + 1))
    echo "PASS $id $title"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL $id $title"
  fi
}

rm -f "$JAR"

# FW-01 anonim yönlendirme ve Türkçe giriş sayfası
LOCATION=$(curl -s -o /dev/null -w "%{redirect_url}" "$BASE/")
BODY=$(curl -s -L -c "$JAR" "$BASE/")
check FW-01 "Anonim kullanıcı giriş sayfasına yönlendirilir" '[[ "$LOCATION" == *"/giris" ]]'
check FW-02 "Giriş sayfası Türkçe metin içerir" 'echo "$BODY" | grep -q "Giriş yap"'

# FW-03 demo hesapla oturum açılır
LOGIN=$(curl -s -b "$JAR" -c "$JAR" -H 'Content-Type: application/json' \
  -d '{"identifier":"ada@demo.local","password":"Demo1234!"}' "$BASE/api/session/login")
check FW-03 "Demo hesapla web oturumu açılır" 'echo "$LOGIN" | grep -q "\"user\"" && grep -q vh_token "$JAR"'

# FW-04 oturumlu ana sayfa
HOME=$(curl -s -b "$JAR" -c "$JAR" "$BASE/")
check FW-04 "Ana sayfa 200 ve kişisel başlık döner" 'echo "$HOME" | grep -q "bir hafızası var" && echo "$HOME" | grep -q "Hafıza defteri"'

# FW-05..FW-11 oturumlu sayfalar
while IFS='|' read -r id path marker; do
  [ -z "$id" ] && continue
  page=$(curl -s -b "$JAR" -c "$JAR" "$BASE/$path")
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/$path")
  check "$id" "/$path sayfası 200 ve '$marker' içerir" '[[ "$code" == "200" ]] && echo "$page" | grep -q "$marker"'
done <<'PAGES'
FW-05|varliklar|Varlıklar
FW-06|kesfet|Keşfet
FW-07|gruplar|Gruplar
FW-08|profil|Profil
FW-09|bildirimler|Bildirimler
FW-10|arsiv|Arşiv
FW-11|ayarlar/sosyal|Sosyal hesaplar
PAGES

# FW-12 İngilizceye geçiş
EN=$(curl -s -b "$JAR" -c "$JAR" -H 'Content-Type: application/json' -d '{"locale":"en"}' "$BASE/api/locale")
ENPAGE=$(curl -s -b "$JAR" -c "$JAR" "$BASE/giris")
check FW-12 "İngilizceye geçişte giriş sayfası İngilizce olur" 'echo "$EN" | grep -q "\"locale\":\"en\"" && echo "$ENPAGE" | grep -q "Sign in"'

# FW-13 Türkçeye dönüş
TR=$(curl -s -b "$JAR" -c "$JAR" -H 'Content-Type: application/json' -d '{"locale":"tr"}' "$BASE/api/locale")
TRPAGE=$(curl -s -b "$JAR" -c "$JAR" "$BASE/giris")
check FW-13 "Türkçeye dönüşte giriş sayfası Türkçe olur" 'echo "$TR" | grep -q "\"locale\":\"tr\"" && echo "$TRPAGE" | grep -q "Giriş yap"'

# FW-14 çıkış
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/session/logout" >/dev/null
AFTER=$(curl -s -o /dev/null -w "%{redirect_url}" -b "$JAR" "$BASE/")
check FW-14 "Çıkış sonrası ana sayfa girişe yönlendirir" '[[ "$AFTER" == *"/giris" ]]'

echo ""
echo "Sonuç: $PASS/$TOTAL geçti, $FAIL başarısız"
rm -f "$JAR"
exit $((FAIL > 0 ? 1 : 0))
