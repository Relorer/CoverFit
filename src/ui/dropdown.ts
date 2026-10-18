import { t, getLang, type Lang } from '../i18n';
import { el } from './dom';
import { state } from '../state';
import { DEVICES, CUSTOM_DEVICE } from '../lib/ratio';
import { outpaintModels } from '../lib/models';

interface DropdownOption {
  value: string;
  label: string;
  selected: boolean;
}

interface Dropdown {
  trigger: HTMLButtonElement;
  value: HTMLElement;
  menu: HTMLUListElement;
  onSelect: (value: string) => void;
}

const dropdowns: Dropdown[] = [];

let langDropdown: Dropdown;
let deviceDropdown: Dropdown;
let modelDropdown: Dropdown;

export function closeAllDropdowns(): void {
  for (const dropdown of dropdowns) closeDropdown(dropdown);
}

export function anyDropdownOpen(): boolean {
  return dropdowns.some((dropdown) => !dropdown.menu.hidden);
}

function makeDropdown(rootId: string, onSelect: (value: string) => void): Dropdown {
  const root = el<HTMLElement>(rootId);
  const dropdown: Dropdown = {
    trigger: root.querySelector<HTMLButtonElement>('.dropdown-trigger')!,
    value: root.querySelector<HTMLElement>('.dropdown-value')!,
    menu: root.querySelector<HTMLUListElement>('.dropdown-menu')!,
    onSelect,
  };

  dropdown.trigger.addEventListener('click', () => toggleDropdown(dropdown));
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Node | null;
    if (!target || dropdown.menu.hidden) return;
    if (dropdown.menu.contains(target) || dropdown.trigger.contains(target)) return;
    closeDropdown(dropdown);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || dropdown.menu.hidden) return;
    closeDropdown(dropdown);
    dropdown.trigger.focus();
  });

  dropdowns.push(dropdown);
  return dropdown;
}

function toggleDropdown(dropdown: Dropdown): void {
  if (dropdown.menu.hidden) openDropdown(dropdown);
  else closeDropdown(dropdown);
}

function openDropdown(dropdown: Dropdown): void {
  for (const other of dropdowns) if (other !== dropdown) closeDropdown(other);
  dropdown.menu.hidden = false;
  dropdown.trigger.setAttribute('aria-expanded', 'true');
  dropdown.menu.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
}

function closeDropdown(dropdown: Dropdown): void {
  if (dropdown.menu.hidden) return;
  dropdown.menu.hidden = true;
  dropdown.trigger.setAttribute('aria-expanded', 'false');
}

function fillDropdown(dropdown: Dropdown, valueLabel: string, options: DropdownOption[]): void {
  dropdown.value.textContent = valueLabel;
  dropdown.menu.innerHTML = '';
  for (const option of options) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dropdown-option';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(option.selected));
    button.textContent = option.label;
    button.addEventListener('click', () => {
      closeDropdown(dropdown);
      dropdown.onSelect(option.value);
      dropdown.trigger.focus();
    });
    item.append(button);
    dropdown.menu.append(item);
  }
}

function selectedLabel(options: DropdownOption[]): string {
  return options.find((option) => option.selected)?.label ?? options[0]?.label ?? '';
}

const LANG_OPTIONS: Array<{ id: Lang; nameKey: 'lang_ru' | 'lang_en' }> = [
  { id: 'ru', nameKey: 'lang_ru' },
  { id: 'en', nameKey: 'lang_en' },
];

export function renderLangDropdown(): void {
  const current = getLang();
  const selected = LANG_OPTIONS.find((option) => option.id === current) ?? LANG_OPTIONS[0]!;
  fillDropdown(
    langDropdown,
    t(selected.nameKey),
    LANG_OPTIONS.map((option) => ({
      value: option.id,
      label: t(option.nameKey),
      selected: option.id === current,
    })),
  );
}

export function renderDeviceDropdown(): void {
  const options: DropdownOption[] = [
    ...DEVICES.map((device) => ({
      value: device.id,
      label: t(device.name),
      selected: state.device === device.id,
    })),
    { value: CUSTOM_DEVICE, label: t('custom_resolution'), selected: state.device === CUSTOM_DEVICE },
  ];
  fillDropdown(deviceDropdown, selectedLabel(options), options);
}

export function renderModelDropdown(): void {
  const options: DropdownOption[] = outpaintModels().map((model) => ({
    value: model.id,
    label: `${model.name} — ${t(model.note)}`,
    selected: state.modelId === model.id,
  }));
  fillDropdown(modelDropdown, selectedLabel(options), options);
}

export function renderDropdowns(): void {
  renderLangDropdown();
  renderDeviceDropdown();
  renderModelDropdown();
}

export function updateDropdownAria(): void {
  langDropdown.trigger.title = t('lang_switch_title');
  modelDropdown.trigger.setAttribute('aria-label', t('fill_model'));
}

export function initDropdowns(
  onLangSelect: (value: string) => void,
  onSelectDevice: (value: string) => void,
  onSelectModel: (value: string) => void,
): void {
  langDropdown = makeDropdown('lang-dd', onLangSelect);
  deviceDropdown = makeDropdown('device-dd', onSelectDevice);
  modelDropdown = makeDropdown('model-dd', onSelectModel);
  renderDropdowns();
}
