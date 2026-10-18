export type Lang = 'ru' | 'en';

const ru: Record<string, string> = {
  meta_description:
    'Обрезает и дорисовывает поля обложки EPUB до нужного соотношения сторон прямо в браузере.',
  new_book: 'Новая книга',
  dropzone_title: 'Перетащите EPUB или изображение',
  dropzone_sub: 'или нажмите, чтобы выбрать файл',
  before: 'До',
  after: 'После',
  compare_both: 'Оба',
  device_title: 'Устройство',
  crop_title: 'Кроп',
  crop_degree_label: 'Степень кропа',
  margins_title: 'Расширение полей',
  fill_model: 'Модель',
  fill_color: 'Цвет',
  fill_linked: 'Один цвет для обоих краёв',
  position_title: 'Положение обложки',
  position_title_crop: 'Что обрезать',
  reset_center: 'Сбросить по центру',
  generate_btn: 'Сгенерировать поля',
  download_btn: 'Скачать файл',
  download_image_btn: 'Скачать изображение',
  download_epub_btn: 'Скачать EPUB',
  custom_resolution: 'Своё разрешение',
  wait_for_generation: 'Дождитесь завершения генерации…',
  reading_image: 'Читаю изображение…',
  reading_epub: 'Читаю EPUB…',
  ratio_same: 'Обложка уже совпадает с целевым соотношением — менять нечего.',
  target_crop: 'Цель {w}×{h} · обрезаем {px}px по {along}',
  target_combined: 'Цель {w}×{h} · обрезаем {crop}px и расширяем на {added}px по {along}',
  along_width: 'ширине',
  along_height: 'высоте',
  crop_top_bottom: 'Обрезаем сверху / снизу',
  crop_left_right: 'Обрезаем слева / справа',
  margins_top_bottom: 'Поля сверху / снизу',
  margins_left_right: 'Поля слева / справа',
  loading_model: 'Загрузка модели {name}…',
  loading_model_pct: 'Загрузка модели {name} · {pct}%',
  loading_model_bytes: 'Загрузка модели {name} · {bytes}',
  generating: 'Генерация полей…',
  done_msg: 'Готово. Сравните результаты и скачайте файл.',
  assembling_image: 'Собираю изображение…',
  assembling_epub: 'Собираю EPUB…',
  file_downloaded: 'Файл скачан.',
  decode_error: 'Не удалось декодировать обложку',
  bytes_unit: 'Б',
  kb_unit: 'КБ',
  mb_unit: 'МБ',
  gb_unit: 'ГБ',
  drag_drop_hint: 'Отпустите, чтобы открыть новую книгу',
  lang_switch_title: 'Язык',
  lang_ru: 'Русский',
  lang_en: 'English',
  device_generic_34: 'Универсальное · 3:4',
  device_generic_23: 'Универсальное · 2:3',
  model_migan_note: 'Быстро · лёгкая · ~27 МБ',
  model_lama_note: 'Качество · тяжёлая · ~198 МБ',
  error_no_memory:
    'Не хватило памяти для загрузки модели. Закройте лишние вкладки и приложения и попробуйте снова.',
  error_webgpu_access:
    'Не удалось получить доступ к WebGPU. Проверьте, что аппаратное ускорение включено в браузере.',
  error_wasm_init:
    'Не удалось инициализировать WebAssembly-движок ONNX Runtime. Перезагрузите страницу и попробуйте снова.',
  error_no_backend:
    'Не удалось запустить ONNX Runtime. Перезагрузите страницу и попробуйте снова.',
  error_model_init: 'Не удалось инициализировать модель',
  error_model_download: 'Не удалось скачать модель ({status})',
  error_xml_parse: 'Не удалось разобрать XML внутри EPUB',
  error_not_epub: 'Это не похоже на EPUB: нет META-INF/container.xml',
  error_no_opf_path: 'В container.xml не указан путь к OPF',
  error_opf_not_found: 'Не найден OPF-файл: {path}',
  error_no_cover: 'Не удалось найти обложку в этом EPUB',
  error_cover_not_found: 'Файл обложки не найден в архиве: {path}',
  error_no_2d_context: 'Не удалось получить 2D-контекст canvas',
  error_to_blob_null: 'canvas.toBlob вернул null',
  license_label: 'лицензия',
  device_paperwhite: 'Kindle Paperwhite 6.8"',
  device_paperwhite_6: 'Kindle Paperwhite 6"',
  device_oasis: 'Kindle Oasis 7"',
  device_scribe: 'Kindle Scribe 10.2"',
  device_kobo_libra: 'Kobo Libra 2',
  device_kobo_clara: 'Kobo Clara 2E',
  settings_title: 'Настройки',
  close: 'Закрыть',
  comfy_searching: 'Ищу ComfyUI…',
  comfy_not_found: 'ComfyUI не найден',
  comfy_online: 'ComfyUI · {addr}',
  comfy_online_unverified: 'ComfyUI? · {addr}',
  comfy_title_online: 'Подключено: {addr}. {info}',
  comfy_title_unverified:
    "{addr} отвечает, но подтвердить, что это именно ComfyUI, не удалось (CORS). Запустите сервер с флагом '--enable-cors-header *' — тогда статус будет точным.",
  comfy_title_offline:
    'ComfyUI не найден. Проверены адреса: {hosts}, порты {ports}. Браузер не умеет сканировать сеть целиком — если ComfyUI запущен на другом устройстве, укажите адрес вручную.',
  comfy_https_hint:
    'Страница открыта по HTTPS, поэтому браузер блокирует HTTP-запросы к ComfyUI.',
  comfy_url_label: 'Адрес ComfyUI',
  comfy_url_placeholder: '192.168.1.7:8188',
  comfy_save: 'Сохранить',
  comfy_search_again: 'Искать заново',
  comfy_download_text:
    'ComfyUI нужен для генерации полей. Если он ещё не установлен — скачайте его, это бесплатно, и запустите на своём компьютере.',
  comfy_download_link: 'Скачать ComfyUI',
  model_flux_note: 'Качество · через локальный ComfyUI · ~22 ГБ',
  comfy_flux_title: 'FLUX.1 Fill (dev)',
  comfy_flux_checking: 'Проверяю модели в ComfyUI…',
  comfy_flux_ready: 'Модель найдена — доступна в списке моделей для outpainting.',
  comfy_flux_missing: 'Модель не найдена в ComfyUI — можно скачать отсюда.',
  comfy_flux_nodes:
    'Файлы модели на месте, но в ComfyUI нет нужных узлов. Обновите ComfyUI (и ComfyUI-Manager) и проверьте снова.',
  comfy_flux_manager:
    'ComfyUI-Manager не отвечает: автоматическая загрузка недоступна. Скачайте файлы вручную и нажмите «Проверить снова».',
  comfy_flux_cors:
    'Не удалось опросить модели: ComfyUI должен быть запущен с флагом \'--enable-cors-header *\'.',
  comfy_flux_dl: 'Скачать модели ({size} ГБ)',
  comfy_flux_dl_step: 'Скачиваю {step}…',
  comfy_flux_recheck: 'Проверить снова',
  comfy_flux_manual_title: 'Ручная установка — положите файлы в папки ComfyUI:',
  comfy_flux_manual_note:
    'Некоторые файлы лежат в закрытом репозитории Hugging Face: нужен аккаунт HF и согласие с лицензией FLUX.1.',
  comfy_flux_gen_window: 'Окно {idx}/{total} · {pct}%',
  comfy_flux_not_connected: 'ComfyUI не подключён — откройте настройки.',
  comfy_flux_generating: 'Генерация через FLUX.1 Fill (dev)…',
  comfy_flux_blending: 'Совмещаю окна…',
  comfy_flux_too_small: 'Целевое разрешение слишком маленькое для генерации окнами.',
};

const en: Record<string, string> = {
  meta_description:
    'Crops and outpaints EPUB cover margins to a target aspect ratio, right in your browser.',
  new_book: 'New book',
  dropzone_title: 'Drop an EPUB or image',
  dropzone_sub: 'or click to browse',
  before: 'Before',
  after: 'After',
  compare_both: 'Both',
  device_title: 'Device',
  crop_title: 'Crop',
  crop_degree_label: 'Crop degree',
  margins_title: 'Extended margins',
  fill_model: 'Model',
  fill_color: 'Color',
  fill_linked: 'Same color for both edges',
  position_title: 'Cover position',
  position_title_crop: 'What to crop',
  reset_center: 'Reset to center',
  generate_btn: 'Generate margins',
  download_btn: 'Download file',
  download_image_btn: 'Download image',
  download_epub_btn: 'Download EPUB',
  custom_resolution: 'Custom resolution',
  wait_for_generation: 'Wait for generation to finish…',
  reading_image: 'Reading image…',
  reading_epub: 'Reading EPUB…',
  ratio_same: 'Cover already matches the target ratio — nothing to adjust.',
  target_crop: 'Target {w}×{h} · cropping {px}px along {along}',
  target_combined: 'Target {w}×{h} · cropping {crop}px and extending by {added}px along {along}',
  along_width: 'width',
  along_height: 'height',
  crop_top_bottom: 'Cropping top / bottom',
  crop_left_right: 'Cropping left / right',
  margins_top_bottom: 'Margins top / bottom',
  margins_left_right: 'Margins left / right',
  loading_model: 'Loading model {name}…',
  loading_model_pct: 'Loading model {name} · {pct}%',
  loading_model_bytes: 'Loading model {name} · {bytes}',
  generating: 'Generating margins…',
  done_msg: 'Done. Compare results and download the file.',
  assembling_image: 'Assembling image…',
  assembling_epub: 'Assembling EPUB…',
  file_downloaded: 'File downloaded.',
  decode_error: 'Failed to decode the cover',
  bytes_unit: 'B',
  kb_unit: 'KB',
  mb_unit: 'MB',
  gb_unit: 'GB',
  drag_drop_hint: 'Drop to open a new book',
  lang_switch_title: 'Language',
  lang_ru: 'Русский',
  lang_en: 'English',
  device_generic_34: 'Universal · 3:4',
  device_generic_23: 'Universal · 2:3',
  model_migan_note: 'Fast · light · ~27 MB',
  model_lama_note: 'Quality · heavy · ~198 MB',
  error_no_memory:
    'Not enough memory to load the model. Close other tabs and applications, then try again.',
  error_webgpu_access:
    'Failed to get WebGPU access. Make sure hardware acceleration is enabled in your browser.',
  error_wasm_init:
    'Failed to initialize the ONNX Runtime WebAssembly engine. Reload the page and try again.',
  error_no_backend:
    'Failed to start ONNX Runtime. Reload the page and try again.',
  error_model_init: 'Failed to initialize the model',
  error_model_download: 'Failed to download the model ({status})',
  error_xml_parse: 'Failed to parse XML inside the EPUB',
  error_not_epub: "This does not look like an EPUB: META-INF/container.xml is missing",
  error_no_opf_path: 'OPF path is not specified in container.xml',
  error_opf_not_found: 'OPF file not found: {path}',
  error_no_cover: 'Failed to find a cover in this EPUB',
  error_cover_not_found: 'Cover file not found in the archive: {path}',
  error_no_2d_context: 'Failed to get 2D canvas context',
  error_to_blob_null: 'canvas.toBlob returned null',
  license_label: 'license',
  device_paperwhite: 'Kindle Paperwhite 6.8"',
  device_paperwhite_6: 'Kindle Paperwhite 6"',
  device_oasis: 'Kindle Oasis 7"',
  device_scribe: 'Kindle Scribe 10.2"',
  device_kobo_libra: 'Kobo Libra 2',
  device_kobo_clara: 'Kobo Clara 2E',
  settings_title: 'Settings',
  close: 'Close',
  comfy_searching: 'Looking for ComfyUI…',
  comfy_not_found: 'ComfyUI not found',
  comfy_online: 'ComfyUI · {addr}',
  comfy_online_unverified: 'ComfyUI? · {addr}',
  comfy_title_online: 'Connected: {addr}. {info}',
  comfy_title_unverified:
    "{addr} answered, but it could not be confirmed as ComfyUI (CORS). Start the server with '--enable-cors-header *' for an exact status.",
  comfy_title_offline:
    'ComfyUI not found. Probed: {hosts}, ports {ports}. A browser cannot scan the whole LAN — if ComfyUI runs on another device, set its address manually.',
  comfy_https_hint:
    'The page is served over HTTPS, so the browser blocks HTTP requests to ComfyUI.',
  comfy_url_label: 'ComfyUI address',
  comfy_url_placeholder: '192.168.1.7:8188',
  comfy_save: 'Save',
  comfy_search_again: 'Search again',
  comfy_download_text:
    'ComfyUI is required to generate the margins. If it is not installed yet, download it for free and run it on your own computer.',
  comfy_download_link: 'Download ComfyUI',
  model_flux_note: 'Quality · via local ComfyUI · ~22 GB',
  comfy_flux_title: 'FLUX.1 Fill (dev)',
  comfy_flux_checking: 'Checking models in ComfyUI…',
  comfy_flux_ready: 'Model found — available in the outpainting model list.',
  comfy_flux_missing: 'Model not found in ComfyUI — it can be downloaded here.',
  comfy_flux_nodes:
    'The model files are present, but ComfyUI is missing required nodes. Update ComfyUI (and ComfyUI-Manager), then check again.',
  comfy_flux_manager:
    'ComfyUI-Manager is not responding: automatic download is unavailable. Download the files manually and press “Check again”.',
  comfy_flux_cors:
    "Could not list models: ComfyUI must be started with '--enable-cors-header *'.",
  comfy_flux_dl: 'Download models ({size} GB)',
  comfy_flux_dl_step: 'Downloading {step}…',
  comfy_flux_recheck: 'Check again',
  comfy_flux_manual_title: 'Manual install — put the files into these ComfyUI folders:',
  comfy_flux_manual_note:
    'Some files live in a gated Hugging Face repository: a Hugging Face account and accepting the FLUX.1 license are required.',
  comfy_flux_gen_window: 'Window {idx}/{total} · {pct}%',
  comfy_flux_not_connected: 'ComfyUI is not connected — open the settings.',
  comfy_flux_generating: 'Generating with FLUX.1 Fill (dev) …',
  comfy_flux_blending: 'Blending windows…',
  comfy_flux_too_small: 'The target resolution is too small for windowed generation.',
};

const dicts: Record<Lang, Record<string, string>> = { ru, en };

let currentLang: Lang = detectLang();

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('coverfit.lang');
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {  }
  const navLang = (navigator.language ?? 'en').toLowerCase();
  return navLang.startsWith('ru') ? 'ru' : 'en';
}

export function getLang(): Lang {
  return currentLang;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const template = dicts[currentLang][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  try {
    localStorage.setItem('coverfit.lang', lang);
  } catch {  }
}
