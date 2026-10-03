# Nazca Cats — Remix • 5.000 NFTs • versão 2

Para começar: [roteiro Sepolia](DEPLOY-SEPOLIA.md). [Baixar projeto com as primeiras artes e o GIF](NazcaCats-Remix-5000.zip). A coleção integral ainda está por produzir.

## Estado da entrega
Contrato e testes funcionais, plano de raridades, gerador por camadas e primeiras artes acabadas. A coleção integral de 5.000 arquivos ainda não foi produzida. `art/finished/` contém apenas as edições realmente geradas; o plano de 5000 não significa 5000 imagens disponíveis. O personagem é inspirado no geoglifo fotografado em `art/reference-geoglyph.jpg`. Esta fotografia é referência, não item automaticamente licenciado para comercialização.

## Regra financeira escolhida
O preço da arte na primeira emissão é zero. O comprador paga **10% de um valor-base de cunhagem configurável**, além do gas da rede. Toda essa taxa é acumulada no contrato para o caixa do projeto. O contrato não tenta calcular 10% do custo de gas.

- `mintBaseValue`: valor-base em wei, ajustável pelo administrador.
- `mintFee()`: taxa por NFT, igual a `ceil(mintBaseValue / 10)` wei.
- `mint(q)`: cobra exatamente `mintFee() × q`; sem reembolso de pagamento excessivo, pois a operação reverte.
- Exemplo: base 0,01 ETH (`10000000000000000` wei), taxa 0,001 ETH (`1000000000000000` wei) por NFT + gas. Os 90% restantes da base não são cobrados.
- Base zero permite emissão sem taxa do projeto; ainda há gas.
- Emissões administrativas `ownerMint` pagam a mesma taxa e consomem a mesma oferta máxima.
- `withdraw()` envia todo o saldo exclusivamente para `projectTreasury`, endereço fixado no deploy. Qualquer carteira pode executar o envio, mas ninguém pode escolher outro destinatário. Não há percentual adicional na retirada.
- Royalties de revenda são fixados em **10% (1000 basis points)** em ERC-2981, para a carteira `initialOwner` do emissor. Não há setter. A troca de administrador não altera esse beneficiário.
- A carteira do caixa pode ser a mesma do emissor ou outra carteira do projeto, indicada no deploy.

**Royalties ERC-2981 são declarados, não cobrados universalmente.** O marketplace precisa pagar. Transferências de carteira para carteira não têm preço de venda conhecido e não geram cobrança automática. Este contrato não contém marketplace próprio. Não há cobrança dupla de 10% + 10% na cunhagem: ela paga apenas a taxa do projeto.

## Raridade proposta
| Classe | Quantidade | Percentual | PNG | GIF |
|---|---:|---:|---:|---:|
| Comum | 3500 | 70% | 3500 | 0 |
| Incomum | 1000 | 20% | 1000 | 0 |
| Raro | 400 | 8% | 200 | 200 |
| Lendário | 100 | 2% | 50 | 50 |
| Total | 5000 | 100% | 4750 | 250 |

5% da coleção é animada. As classes dependem de combinações de pelagem, olhos, fundo e efeitos. A geometria e a posição do gato são fixas. Para GIFs, animar brilho, estrelas e ambiente; sem movimentar patas ou cabeça. As percentagens são plano de produção e metadados, não um sorteio executado pelo contrato. O pacote não promete que as edições raras serão emitidas aleatoriamente. IDs são sequenciais: se os metadados forem públicos, o próximo NFT pode ser antecipado.

## Implantar no Remix
1. Acesse https://remix.ethereum.org. Copie **apenas** `contracts/NazcaCats.flat.sol` para um arquivo `.sol`. Esta versão contém as dependências e compila sem baixá-las. Alternativamente use `contracts/NazcaCats.sol`, que importa OZ 5.0.2 via pacote versionado. Não compile as duas versões juntas.
2. Compiler **0.8.24**, otimização **200 runs**, EVM **Shanghai**.
3. Primeiro teste no **Remix VM (Shanghai)**. Escolha `NazcaCats` e preencha:
   - `initialOwner`: carteira administradora e beneficiária permanente dos royalties.
   - `treasury`: carteira permanente do caixa do projeto (não nula).
   - `initialBaseURI`: `ipfs://CID_REAL_DOS_METADADOS/`, barra final obrigatória. Para teste local, `ipfs://example/` não tem arte real.
   - `initialBaseValue`: valor-base em wei. Ex.: `10000000000000000`.
4. A venda começa fechada. Execute `configureSale(true, valorBaseEmWei)`.
5. Consulte `mintFee()`. No campo VALUE envie esse valor em wei, multiplicado pela quantidade, e chame `mint(quantidade)`. Máximo 20 por chamada; pode precisar de menos conforme gas disponível.
6. Para emissão administrativa, envie o mesmo pagamento e use `ownerMint(destinatario, quantidade)`.
7. Confira `ownerOf(id)`, `tokenURI(id)` e `royaltyInfo(id, valorVenda)`. O primeiro ID é 1 e o último 5000.
8. Teste em uma testnet da rede EVM compatível com Shanghai escolhida, antes de um deploy real. Não foi implantado em rede pública nem auditado independentemente.

Este é um contrato novo, não um upgrade do pacote anterior. Quem já implantou a versão 1 não recebe estas mudanças automaticamente.

## Metadados, imagens e GIFs
`tokenURI(id)` retorna `baseTokenURI + id + ".json"`. Cada JSON deve conter `name`, `description`, `image` e `attributes`. PNGs e GIFs usam seu próprio caminho IPFS no campo `image`; GIFs precisam ser realmente multiframe. Inclua atributos `Raridade`, `Formato`, `Pelagem`, `Olhos` e `Fundo`. O contrato não renderiza nem valida imagens.

Use camadas aprovadas no mesmo tamanho e coordenadas para as variações. `scripts/generate.py` é o gerador de PNGs do primeiro pacote: compõe 5000 combinações, verifica tamanho e rejeita imagens com pixels idênticos. **Ele não gera os GIFs nem aplica automaticamente as quotas da tabela.** Não use sua saída sem adequar a distribuição de raridade.

Para empacotar a coleção final já produzida com quotas exatas, use `scripts/package_collection.py`. Forneça um catálogo de 5000 artes aprovadas, seus caminhos locais e atributos. Ele verifica quotas, GIFs multiframe, unicidade visual e produz os JSONs e o manifesto para publicação; não inventa as imagens ausentes.

Publique/pin as imagens e GIFs no IPFS, preservando nomes e extensões. Depois publique os JSONs em outra pasta CID, com `1.json` a `5000.json` na raiz. Preserve o manifesto e camadas; pinning redundante melhora disponibilidade, pois IPFS não a garante sozinho.

Execute `configureMetadata("ipfs://CID_REAL_DOS_METADADOS/", sha256DoManifesto)`. O hash de 32 bytes compromete o manifesto, mas não verifica unicidade ou raridade on-chain. Confira JSONs/imagens antes de `freezeMetadata()`: congelamento irreversível. Use CID imutável; uma URI HTTP pode continuar servindo bytes diferentes.

## Administração
- `configureSale(false, base)` fecha emissão pública. Transferências e emissão administrativa continuam possíveis.
- `transferOwnership(novo)` exige `acceptOwnership()` pelo novo administrador.
- `renounceOwnership()` elimina a administração permanentemente. Não renuncie antes de concluir configurações; saques ao caixa continuam públicos e possíveis nesta versão.
- Oferta máxima de 5000 inclui todas as emissões. Não há burn, proxy, allowlist, limite por carteira ou reveal aleatório. Uma carteira pode adquirir toda a coleção em múltiplas chamadas.

## Testes
`npm ci` seguido de `npm test`.

O teste compila e implanta localmente; verifica pagamento da taxa, arredondamento, royalties de 10%, permissões, URI, congelamento, transferência, retirada, troca de administrador e preenchimento de toda a oferta de 5000. O arquivo único também é compilado por `node scripts/flatten.cjs`. O Ganache pode usar fallback JavaScript nas versões novas de Node.

Para scripts de arte: Python 3 e `pip install -r requirements.txt`. Revisão visual continua necessária: hashes diferentes não significam diferenças perceptuais, estilo correto ou originalidade.
