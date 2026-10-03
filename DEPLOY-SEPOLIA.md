# Implantação na Sepolia

Carteira do emissor/administrador e caixa escolhida:
`0x7464051f8E189C34F516e7e3f6d1935e56788424`

Regra aprovada: valor-base 0,01 ETH de teste; cobrança de 0,001 ETH de teste por NFT, mais gas.

## Configuração mínima
- Arquivo: `contracts/NazcaCats.flat.sol` (contém todas as dependências).
- Compiler: 0.8.24; optimizer ligado; runs 200; EVM Shanghai.
- Contrato selecionado: **NazcaCats**, e não Context ou outra dependência.
- Environment: **Browser Extension / MetaMask**. A opção pode se chamar Injected Provider em versões antigas.
- Rede da MetaMask: **Ethereum Sepolia**, chain ID 11155111.
- Se aparecer Remix VM com uma conta de 100 ETH, você está na simulação local.
- ETH é o nome da moeda também na Sepolia; a palavra ETH sozinha não identifica mainnet. Confira a rede/chain ID do ambiente e da carteira.

## Constructor
| Campo | Valor |
|---|---|
| initialOwner | 0x7464051f8E189C34F516e7e3f6d1935e56788424 |
| treasury | 0x7464051f8E189C34F516e7e3f6d1935e56788424 |
| initialBaseURI | ipfs://CID_REAL_DOS_METADADOS/ |
| initialBaseValue | 10000000000000000 |

**Value do deploy: 0 wei.** O constructor não recebe pagamento.

A URI ainda precisa do CID real: a coleção integral e seus metadados ainda não foram publicados. Em um teste técnico sem arte publicada pode usar `ipfs://example/`, sabendo que os NFTs não exibirão imagens. Nunca congele uma URI provisória.

Você confirma o deploy na MetaMask. Depois registre endereço do contrato e hash da transação. A venda começa fechada: para teste, o administrador chama `configureSale(true, 10000000000000000)`. Em seguida consulte `mintFee()`: deve retornar `1000000000000000`.

Para emitir 1 NFT, envie VALUE `1000000000000000 wei` e chame `mint(1)`. A MetaMask mostra taxa de gas adicional. O saldo é acumulado para o caixa; `withdraw()` só envia para o endereço fixo acima. Royalties de 10% são declarados em ERC-2981; dependem de implementação do marketplace na revenda.

Este roteiro não significa contrato implantado. Nenhuma transação foi enviada à Sepolia durante a preparação.
