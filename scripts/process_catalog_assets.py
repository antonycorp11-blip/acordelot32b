#!/usr/bin/env python3
import os
import shutil
from PIL import Image

BASE_DIR = '/Users/aquillesantony/Desktop/acordelot32b'

# Target output directories
ROOT_ARMAS = os.path.join(BASE_DIR, 'ARMAS CLASSE TECLAS ACORDELOT')
ROOT_ARMAR = os.path.join(BASE_DIR, 'ARMAR CLASSE TECLAS ACORDELOT')
ROOT_EQUIP = os.path.join(BASE_DIR, 'EQUIPAMENTOS CLASSE TECLAS ACORDELOT')

PUBLIC_ARMAS = os.path.join(BASE_DIR, 'public/assets/catalogo/armas')
PUBLIC_EQUIP = os.path.join(BASE_DIR, 'public/assets/catalogo/equipamentos')

for d in [ROOT_ARMAS, ROOT_EQUIP, PUBLIC_ARMAS, PUBLIC_EQUIP]:
    os.makedirs(d, exist_ok=True)

# 1. Definição precisa dos itens de cada imagem
# (x1, y1, x2, y2) com margem segura acima dos textos
DATA = [
    # --- ARMAS ---
    {
        'file': '53BC04FD-2724-4A89-B1B7-56CDFE0A9686.PNG',
        'type': 'weapon',
        'tier': 'T1',
        'items': [
            {'name': 'Tecla de Carvalho', 'slug': 'tecla_de_carvalho', 'box': (180, 126, 640, 490), 'desc': 'Espada-teclado forjada em carvalho antigo das florestas de Acordelot.'},
            {'name': 'Ferro do Pianista', 'slug': 'ferro_do_pianista', 'box': (800, 120, 1330, 500), 'desc': 'Lâmina de ferro temperado moldada para iniciantes das artes sonoras.'},
            {'name': 'Cravo de Batalha', 'slug': 'cravo_de_batalha', 'box': (140, 560, 720, 960), 'desc': 'Cravo marcial com detalhes entalhados a mão e sonoridade firme.'},
            {'name': 'Acordeonita', 'slug': 'acordeonita', 'box': (820, 650, 1240, 940), 'desc': 'Adaga ágil com fole rítmico para estocadas sonoras rápidas.'},
        ]
    },
    {
        'file': '296786AF-6921-4E62-8C8F-7A4EFB2A12BC.PNG',
        'type': 'weapon',
        'tier': 'T2',
        'items': [
            {'name': 'Acordelâmina T2', 'slug': 'acordelamina_t2', 'box': (60, 124, 510, 490), 'desc': 'Evolução clássica da Acordelâmina com revestimento de safira e latão afinado.'},
            {'name': 'Cravo Azul', 'slug': 'cravo_azul', 'box': (510, 120, 990, 500), 'desc': 'Cravo cerimonial com afinação harmônica e ornamentos dourados.'},
            {'name': 'Teclado Resonante', 'slug': 'teclado_resonante', 'box': (950, 120, 1440, 530), 'desc': 'Lâmina infundida com gemas sonoras que vibram em tons cristalinos.'},
            {'name': 'Acordeon de Aço', 'slug': 'acordeon_de_aco', 'box': (130, 570, 720, 960), 'desc': 'Espada pesada com foles de compressão acústica de alto impacto.'},
            {'name': 'Órgão do Peregrino', 'slug': 'orgao_do_peregrino', 'box': (770, 570, 1350, 960), 'desc': 'Órgão de tubos de campanha capaz de emitir acordes graves de corte.'},
        ]
    },
    {
        'file': '7E35797D-1D9D-4A49-A627-D317F40696C6.PNG',
        'type': 'weapon',
        'tier': 'T3',
        'items': [
            {'name': 'Piano de Cristal', 'slug': 'piano_de_cristal', 'box': (140, 120, 660, 510), 'desc': 'Lâmina translúcida de quartzo musical com notas eufônicas cintilantes.'},
            {'name': 'Cravo Real de Acordelot', 'slug': 'cravo_real_de_acordelot', 'box': (770, 120, 1320, 540), 'desc': 'Arma oficial da guarda palaciana de Acordelot com timbre majestoso.'},
            {'name': 'Órgão Resonante', 'slug': 'orgao_resonante_arma', 'box': (130, 570, 680, 980), 'desc': 'Tubos ressonantes com vitrais iluminados que geram ondas sônicas destrutivas.'},
            {'name': 'Celesta Lunar', 'slug': 'celesta_lunar_arma', 'box': (750, 570, 1340, 990), 'desc': 'Lâmina abençoada pelas marés noturnas, tecida em prata e pedras estelares.'},
        ]
    },
    {
        'file': '5F41222F-ACC1-46D5-A1F4-EFAABDBC49D3.PNG',
        'type': 'weapon',
        'tier': 'T4',
        'items': [
            {'name': 'Piano do Maestro', 'slug': 'piano_do_maestro', 'box': (110, 120, 700, 505), 'desc': 'Instrumento de alta regência, decorado com ouro polido e joias sonoras.'},
            {'name': 'Catedral Harmônica', 'slug': 'catedral_harmonica_arma', 'box': (750, 120, 1360, 510), 'desc': 'Estrutura maciça em forma de catedral gótica com tubos de bronze sagrado.'},
            {'name': 'Cravo do Rei', 'slug': 'cravo_do_rei', 'box': (80, 580, 710, 980), 'desc': 'O cravo supremo dos antigos monarcas, banhado em veludo rubro e ouro puro.'},
            {'name': 'Concerto de Cristal', 'slug': 'concerto_de_cristal', 'box': (750, 580, 1380, 990), 'desc': 'Lâmina hiperprismática que refrata a luz em arpejos musicais cortantes.'},
        ]
    },
    {
        'file': '291460D1-C921-4A68-8213-88E2F63DDE0E.PNG',
        'type': 'weapon',
        'tier': 'T5',
        'items': [
            {'name': 'Virtuose', 'slug': 'virtuose_arma', 'box': (70, 130, 570, 930), 'desc': 'Arma mística lendária envolta em anéis de notas douradas e safiras primordiais.'},
            {'name': 'Órgão Celestial', 'slug': 'orgao_celestial', 'box': (520, 130, 1000, 930), 'desc': 'A mais alta glória dos órgãos de Acordelot, com rosácea solar e tubos divinos.'},
            {'name': 'Réquiem do Cravo', 'slug': 'requiem_do_cravo', 'box': (940, 130, 1400, 930), 'desc': 'Cravo sombrio de ébano imperial dedicado às composições do réquiem eterno.'},
        ]
    },

    # --- EQUIPAMENTOS ---
    {
        'file': '23FCDDDC-52CE-4CA1-BD2E-01C594002DDB.PNG',
        'type': 'equipment',
        'tier': 'T2',
        'set': 'Conjunto do Pianista Solitário',
        'items': [
            {'name': 'Colar do Pianista Solitário', 'slot': 'colar', 'slug': 'colar_do_pianista_solitario', 'box': (190, 120, 650, 530)},
            {'name': 'Anel do Pianista Solitário', 'slot': 'anel', 'slug': 'anel_do_pianista_solitario', 'box': (820, 200, 1180, 460)},
            {'name': 'Relíquia do Pianista Solitário', 'slot': 'reliquia', 'slug': 'reliquia_do_pianista_solitario', 'box': (180, 540, 640, 1060)},
            {'name': 'Aura do Pianista Solitário', 'slot': 'aura', 'slug': 'aura_do_pianista_solitario', 'box': (650, 560, 1380, 1040)},
        ]
    },
    {
        'file': '3F00BCB8-43F8-4853-9F90-BC8FF621C26F.PNG',
        'type': 'equipment',
        'tier': 'T2',
        'set': 'Conjunto do Acordeonista de Acordelot',
        'items': [
            {'name': 'Colar do Acordeonista', 'slot': 'colar', 'slug': 'colar_do_acordeonista', 'box': (170, 120, 630, 530)},
            {'name': 'Anel do Acordeonista', 'slot': 'anel', 'slug': 'anel_do_acordeonista', 'box': (810, 200, 1180, 440)},
            {'name': 'Relíquia do Acordeonista', 'slot': 'reliquia', 'slug': 'reliquia_do_acordeonista', 'box': (150, 540, 650, 1050)},
            {'name': 'Aura do Acordeonista', 'slot': 'aura', 'slug': 'aura_do_acordeonista', 'box': (650, 540, 1380, 1030)},
        ]
    },
    {
        'file': '2F7D12F7-4B8A-46C4-B2B0-C60D69EFFD3C.PNG',
        'type': 'equipment',
        'tier': 'T3',
        'set': 'Conjunto do Órgão Resonante',
        'items': [
            {'name': 'Colar do Órgão Resonante', 'slot': 'colar', 'slug': 'colar_do_orgao_resonante', 'box': (190, 120, 660, 530)},
            {'name': 'Anel do Órgão Resonante', 'slot': 'anel', 'slug': 'anel_do_orgao_resonante', 'box': (810, 200, 1170, 460)},
            {'name': 'Relíquia do Órgão Resonante', 'slot': 'reliquia', 'slug': 'reliquia_do_orgao_resonante', 'box': (180, 530, 650, 1060)},
            {'name': 'Aura do Órgão Resonante', 'slot': 'aura', 'slug': 'aura_do_orgao_resonante', 'box': (640, 540, 1360, 1040)},
        ]
    },
    {
        'file': '79DF9B04-8ED2-4BE3-B795-54DF833D5ACA.PNG',
        'type': 'equipment',
        'tier': 'T3',
        'set': 'Conjunto da Celesta Lunar',
        'items': [
            {'name': 'Colar da Celesta Lunar', 'slot': 'colar', 'slug': 'colar_da_celesta_lunar', 'box': (210, 120, 660, 540)},
            {'name': 'Anel da Celesta Lunar', 'slot': 'anel', 'slug': 'anel_da_celesta_lunar', 'box': (810, 210, 1170, 460)},
            {'name': 'Relíquia da Celesta Lunar', 'slot': 'reliquia', 'slug': 'reliquia_da_celesta_lunar', 'box': (200, 540, 660, 1050)},
            {'name': 'Aura da Celesta Lunar', 'slot': 'aura', 'slug': 'aura_da_celesta_lunar', 'box': (670, 560, 1340, 1040)},
        ]
    },
    {
        'file': '5AAF1291-1C4B-483E-B58C-0FC9C99C5580.PNG',
        'type': 'equipment',
        'tier': 'T4',
        'set': 'Conjunto do Maestro de Acordelot',
        'items': [
            {'name': 'Colar do Maestro', 'slot': 'colar', 'slug': 'colar_do_maestro', 'box': (180, 120, 650, 550)},
            {'name': 'Anel do Maestro', 'slot': 'anel', 'slug': 'anel_do_maestro', 'box': (830, 210, 1200, 460)},
            {'name': 'Relíquia do Maestro', 'slot': 'reliquia', 'slug': 'reliquia_do_maestro', 'box': (170, 540, 650, 1060)},
            {'name': 'Aura do Maestro', 'slot': 'aura', 'slug': 'aura_do_maestro', 'box': (650, 560, 1400, 1050)},
        ]
    },
    {
        'file': '56BC019C-D2A6-4B8E-BEFB-614878D06228.PNG',
        'type': 'equipment',
        'tier': 'T4',
        'set': 'Conjunto da Catedral Harmônica',
        'items': [
            {'name': 'Colar da Catedral Harmônica', 'slot': 'colar', 'slug': 'colar_da_catedral_harmonica', 'box': (180, 120, 640, 540)},
            {'name': 'Anel da Catedral Harmônica', 'slot': 'anel', 'slug': 'anel_da_catedral_harmonica', 'box': (800, 200, 1180, 470)},
            {'name': 'Relíquia da Catedral Harmônica', 'slot': 'reliquia', 'slug': 'reliquia_da_catedral_harmonica', 'box': (170, 530, 650, 1060)},
            {'name': 'Aura da Catedral Harmônica', 'slot': 'aura', 'slug': 'aura_da_catedral_harmonica', 'box': (620, 500, 1380, 1060)},
        ]
    },
    {
        'file': '628A9160-8479-4166-8A84-D57A935B85BF.PNG',
        'type': 'equipment',
        'tier': 'T5',
        'set': 'Conjunto Virtuose',
        'items': [
            {'name': 'Colar Virtuose', 'slot': 'colar', 'slug': 'colar_virtuose', 'box': (180, 120, 660, 540)},
            {'name': 'Anel Virtuose', 'slot': 'anel', 'slug': 'anel_virtuose', 'box': (800, 200, 1200, 470)},
            {'name': 'Relíquia Virtuose', 'slot': 'reliquia', 'slug': 'reliquia_virtuose', 'box': (160, 540, 660, 1060)},
            {'name': 'Aura Virtuose', 'slot': 'aura', 'slug': 'aura_virtuose', 'box': (650, 550, 1360, 1060)},
        ]
    },
    {
        'file': '37D3520C-D8C0-4F7A-9CA6-84A0E4D8835C.PNG',
        'type': 'equipment',
        'tier': 'T5',
        'set': 'Conjunto do Concerto Celestial',
        'items': [
            {'name': 'Colar do Concerto Celestial', 'slot': 'colar', 'slug': 'colar_do_concerto_celestial', 'box': (200, 120, 640, 530)},
            {'name': 'Anel do Concerto Celestial', 'slot': 'anel', 'slug': 'anel_do_concerto_celestial', 'box': (810, 200, 1180, 460)},
            {'name': 'Relíquia do Concerto Celestial', 'slot': 'reliquia', 'slug': 'reliquia_do_concerto_celestial', 'box': (180, 540, 640, 1050)},
            {'name': 'Aura do Concerto Celestial', 'slot': 'aura', 'slug': 'aura_do_concerto_celestial', 'box': (640, 560, 1360, 1030)},
        ]
    }
]

def crop_and_clean(img, box):
    cropped = img.crop(box)
    w, h = cropped.size
    pix = cropped.load()

    # Amostra dos 4 cantos para cor de fundo
    corners = [pix[0, 0], pix[w - 1, 0], pix[0, h - 1], pix[w - 1, h - 1]]
    br = sum(c[0] for c in corners) / 4.0
    bg = sum(c[1] for c in corners) / 4.0
    bb = sum(c[2] for c in corners) / 4.0

    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out_pix = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            dist = abs(r - br) + abs(g - bg) + abs(b - bb)
            is_pure_mag = (dist < 46) or (g < 35 and r > 160 and b > 150)
            if is_pure_mag:
                out_pix[x, y] = (0, 0, 0, 0)
            elif dist < 120 and g < 60:
                # Transição suave / despill de magenta na borda
                alpha = int(255 * ((dist - 40) / 80.0))
                alpha = max(0, min(255, alpha))
                cr = min(r, int(r * 0.75 + g * 0.25))
                cb = min(b, int(b * 0.75 + g * 0.25))
                out_pix[x, y] = (cr, g, cb, alpha)
            else:
                out_pix[x, y] = (r, g, b, 255)

    # Trim final na transparência
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    return out

total_processed = 0

for entry in DATA:
    img_path = os.path.join(BASE_DIR, entry['file'])
    img = Image.open(img_path).convert('RGBA')
    is_weapon = entry['type'] == 'weapon'

    for item in entry['items']:
        cropped_sprite = crop_and_clean(img, item['box'])
        slug = item['slug']
        tier = entry['tier']

        if is_weapon:
            # 1. Salvar no diretório ARMAS CLASSE TECLAS ACORDELOT por Tier
            tier_dir = os.path.join(ROOT_ARMAS, f'Tier {tier[1:]}')
            os.makedirs(tier_dir, exist_ok=True)
            path_root = os.path.join(tier_dir, f'{slug}.png')
            cropped_sprite.save(path_root)

            # 2. Salvar na pasta pública para o Vite
            path_public = os.path.join(PUBLIC_ARMAS, f'{slug}.png')
            cropped_sprite.save(path_public)

            item_name = item['name']
            print(f"✓ [ARMA {tier}] {item_name} -> {cropped_sprite.size}")
        else:
            set_name = entry['set']
            # 1. Salvar no diretório EQUIPAMENTOS CLASSE TECLAS ACORDELOT por Tier e Conjunto
            tier_set_dir = os.path.join(ROOT_EQUIP, f'Tier {tier[1:]}', set_name)
            os.makedirs(tier_set_dir, exist_ok=True)
            path_root = os.path.join(tier_set_dir, f'{slug}.png')
            cropped_sprite.save(path_root)

            # 2. Salvar na pasta pública para o Vite
            path_public = os.path.join(PUBLIC_EQUIP, f'{slug}.png')
            cropped_sprite.save(path_public)

            item_name = item['name']
            item_slot = item['slot']
            print(f"✓ [EQUIP {tier} - {set_name}] {item_name} ({item_slot}) -> {cropped_sprite.size}")

        total_processed += 1

# Cria link ou cópia para "ARMAR CLASSE TECLAS ACORDELOT" para cobrir a digitação do usuário
if not os.path.exists(ROOT_ARMAR):
    try:
        os.symlink(ROOT_ARMAS, ROOT_ARMAR)
    except Exception:
        shutil.copytree(ROOT_ARMAS, ROOT_ARMAR)

print(f'\nTotal de itens processados com sucesso: {total_processed}')
