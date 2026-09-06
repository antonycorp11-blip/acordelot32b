# Acordelot — Diálogos e vozes musicais

## Direção

Todo diálogo continua escrito em português. A voz não pronuncia palavras e não precisa ser compreendida: ela é uma frase feita de notas curtas que acompanha o texto, semelhante a uma linguagem musical própria do mundo.

O sistema deve acrescentar identidade sem atrasar a leitura.

## Identidade de voz

Cada personagem possui:

- registro grave, médio ou agudo;
- conjunto preferido de intervalos;
- timbre básico;
- velocidade e duração das notas;
- frequência de pausas;
- intensidade máxima.

Perfis iniciais:

- **Akles:** grave-médio, triângulo suave, modo menor, frases contidas.
- **Pippo:** agudo, seno luminoso, pentatônica maior, frases rápidas e curiosas.
- **Wins:** médio-agudo, notas sustentadas e aéreas, frases mais melódicas.
- **Huans:** médio-grave, ataques curtos semelhantes a cordas dedilhadas.
- **Narrador:** grave, lento e discreto.

NPCs recebem uma identidade determinística derivada de seu ID. A mesma fala do mesmo NPC produz sempre a mesma sequência; assim ela parece uma língua, não ruído aleatório.

## Regras de conforto

- no máximo 22 ataques sonoros por fala;
- parar a frase anterior ao avançar o texto;
- volume abaixo da música e dos efeitos importantes;
- respeitar a opção de áudio desligado;
- nunca usar voz musical para esconder informação necessária;
- sinais musicais reais da história, como o Sol bemol ouvido por Akles, devem usar a frequência correta e não o gerador aleatório;
- disponibilizar posteriormente controles separados de volume e opção para desligar as vozes.

## Microcena tutorial

Uma microcena segue cinco passos:

1. um acontecimento narrativo cria a necessidade;
2. câmera ou diálogo aponta o elemento relevante;
3. a interface abre e destaca somente o controle necessário;
4. o jogador executa a ação;
5. personagem reage e a cena devolve o controle.

Isso permite ensinar telas e menus sem transformar cada botão numa missão independente.

## Primeira sequência implementada

O primeiro lote cobre apenas:

1. **Despertar sem Nome:** abertura automática, Akles sem memória e recuperação do controle.
2. **Sol Bemol:** seguir uma vibração e reconhecer a frequência exata.
3. **Criaturas Dissonantes:** cena de ameaça e primeiro combate.
4. **Três Ecos:** aparição coordenada de Dó, Mi e Sol e apresentação da tríade maior.

A abertura roda sempre que o jogador entra no jogo, mesmo com save anterior. Ela reposiciona Akles para a sequência, mas não remove itens, nível ou progresso.

