import subprocess
import time
import os
from PIL import Image
import pytesseract
import csv


# ===================================================================
# ⚠️ AYARLAR (KURULUM YOLUNU VE KOORDİNATLARI DÜZENLEYİN) ⚠️
# ===================================================================


# 1. Tesseract OCR Motorunun Yolu (Kendi kurulum yolunuzla değiştirin)
try:
    # BU YOLU KENDİ TESSERACT.EXE KONUMUNUZLA DEĞİŞTİRİN
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
except AttributeError:
    pass


# 2. Otomasyon Koordinatları
# Bu koordinatları scrcpy pencerenizde kesin olarak tespit etmelisiniz!
HEMEN_GELSIN_X = 250
HEMEN_GELSIN_Y = 450


# 3. KEŞİF AMAÇLI KOORDİNAT SETLERİ
# ÖRNEK: Kaydırma sonrası ekranda kalan 4 farklı alanı temsil eden koordinatlar
# Her bir koordinat (X1, Y1, X2, Y2) formatındadır.
DISCOVERY_COORDINATES = {
    # Mağaza Adı (Kaydırma sonrası ilk mağazanın adının göründüğü bölge)
    "Magaza_Adi_1": (150, 200, 750, 250),
   
    # Puan/Sayısal Veri (Kaydırma sonrası ilk mağazanın puanının göründüğü bölge)
    "Puan_1": (150, 250, 300, 300),
   
    # Mağaza Adı (Kaydırma sonrası ikinci mağazanın adının göründüğü bölge)
    "Magaza_Adi_2": (150, 450, 750, 500),
   
    # Teslimat Süresi (Kaydırma sonrası ikinci mağazanın teslimat süresinin göründüğü bölge)
    "Teslimat_Suresi_2": (150, 500, 500, 550),
}




# Verilerin kaydedileceği dosya
OUTPUT_FILE = "trendyol_discovery_veri.csv"
# ===================================================================




# --- ADB Otomasyon Fonksiyonları ---


def take_screenshot(filename="screen.png"):
    """ADB kullanarak cihazdan ekran görüntüsü alır ve bilgisayara kaydeder."""
    try:
        # Cihazın içine kaydet
        subprocess.run(["adb", "shell", "screencap", "/sdcard/screen.png"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(1)
        # Bilgisayara çek
        result = subprocess.run(["adb", "pull", "/sdcard/screen.png", filename], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return filename
    except subprocess.CalledProcessError as e:
        print(f"Hata: Ekran görüntüsü alınamadı veya ADB komutu başarısız. Detay: {e.stderr.decode().strip()}")
        return None


def click_button(x, y):
    """Belirtilen koordinatlara tıklama komutu gönderir."""
    try:
        subprocess.run(["adb", "shell", "input", "tap", str(x), str(y)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Koordinat ({x}, {y}) tıklandı. Bekleniyor")
        time.sleep(3) # Sayfa yüklenmesi için bekleme
    except subprocess.CalledProcessError as e:
        print(f"Hata: Tıklama komutu başarısız. Detay: {e.stderr.decode().strip()}")


def swipe_screen(duration_ms=1000):
    """Mağaza listesini aşağı kaydırma yapar."""
    try:
        # 500, 1500 (alt orta) noktasından 500, 500 (üst orta) noktasına kaydırma
        subprocess.run(["adb", "shell", "input", "swipe", "500", "1500", "500", "500", str(duration_ms)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("Ekran kaydırıldı")
        time.sleep(2) # Kaydırma bitince bekleme
    except subprocess.CalledProcessError as e:
        print(f"Hata: Kaydırma komutu başarısız. Detay: {e.stderr.decode().strip()}")




# --- Görüntü İşleme ve OCR Fonksiyonu ---


def process_and_ocr(image_path, coords):
    """Görüntüyü kırpar ve OCR ile metni okur."""
    try:
        img = Image.open(image_path)
        cropped_img = img.crop(coords)
        config = r'--oem 3 --psm 6' # PSM 6: Tek bir metin bloğunu varsayar
        text = pytesseract.image_to_string(cropped_img, lang='tur', config=config)
        return text.strip().replace('\n', ' ')
    except Exception as e:
        return "OCR_HATA"


# --- ANA SCRAPING DÖNGÜSÜ (KEŞİF MODU) ---


def main_scraper(num_iterations=20):
    """Koordinatları test etmek için keşif döngüsünü çalıştırır."""
   
    # CSV Başlık satırını oluştur
    header_list = ["Döngü_No", "Screenshot_Adi"]
    for key in DISCOVERY_COORDINATES:
        header_list.append(f"{key}_Coords")
        header_list.append(f"{key}_Deger")
   
    file_exists = os.path.exists(OUTPUT_FILE)
   
    with open(OUTPUT_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, delimiter=';')
       
        if not file_exists:
            writer.writerow(header_list)


    print("--- KOORDİNAT KEŞİF SCRAPER BAŞLADI ---")
    print("Trendyol Go uygulaması scrcpy penceresinde ana ekranda olmalıdır")
   
    # 1. Hemen Gelsin Butonuna Tıkla
    click_button(HEMEN_GELSIN_X, HEMEN_GELSIN_Y)


   
    for i in range(num_iterations):
        print(f"\n--- Döngü {i+1}/{num_iterations} ---")
       
        screenshot_file = f"screen_{i}.png"
       
        # 2. Ekran Görüntüsünü Al
        if not take_screenshot(screenshot_file):
            continue
       
        csv_row_data = [i + 1, screenshot_file]
       
        # 3. Tanımlanan Tüm Koordinatları Dene ve Kaydet
        for key, coords in DISCOVERY_COORDINATES.items():
           
            extracted_value = process_and_ocr(screenshot_file, coords)
            print(f"[{key} @ {coords}]: {extracted_value}")


            # CSV satırına koordinat ve değeri ekle
            csv_row_data.append(str(coords).replace(',', '')) # Parantezleri ve virgülleri sil
            csv_row_data.append(extracted_value)
       
        # 4. Veriyi CSV'ye Kaydet
        with open(OUTPUT_FILE, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f, delimiter=';')
            writer.writerow(csv_row_data)
       
        # 5. Ekranı Kaydır (Yeni Mağazalara Geç)
        swipe_screen()
       
    print(f"\nKEŞİF TAMAMLANDI. Veriler '{OUTPUT_FILE}' dosyasına kaydedildi")




if __name__ == "__main__":
    main_scraper(num_iterations=20)

