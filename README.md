# Spacewars Battleship

A Star Wars themed Battleship game built for Computing 2: Applications at Imperial College London.

## How to play

Two players take turns firing at each other's fleets on a 10×10 grid. On a hit, the same player fires again. On a miss, the device is passed to the other player. The first player to sink all five enemy ships wins.

### Fleet

| Ship | Cells | Shape |
|------|-------|-------|
| TIE Fighter | 2 | Straight line |
| Jedi Starfighter | 2 | Straight line |
| Slave I | 3 | Straight line |
| X-wing | 5 | T-shape |
| Millennium Falcon | 6 | 2×3 block |

## Installation

```
npm install
```

## Run tests

```
npm test
```

## Generate API documentation

```
npm run docs
```

Then open `docs/index.html` in a browser.

## Credits

Ship images: Lego Star Wars fan builds (personal use).
Logo: original design.
Built with [Mocha](https://mochajs.org/) (testing) and [JSDoc](https://jsdoc.app/) + [Docdash](https://github.com/clenemt/docdash) (documentation).
