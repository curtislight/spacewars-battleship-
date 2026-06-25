# Spacewars Battleship

A Star Wars themed Battleship game built for Computing 2: Applications at Imperial College London.

Two players take turns firing at each other's fleets on a 10×10 grid. On a hit, the same player fires again. On a miss, the device is passed to the other player. The first player to sink all five enemy ships wins.

## Fleet

| Ship | Cells | Shape |
|------|-------|-------|
| TIE Fighter | 2 | Straight line |
| Jedi Starfighter | 2 | Straight line |
| Slave I | 3 | Straight line |
| X-wing | 5 | T-shape |
| Millennium Falcon | 6 | 2×3 block |

## Installation

Requires [Node.js](https://nodejs.org/).

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

Then open `docs/index.html` in a browser to view the full API reference.

## Project structure

```
spacewars-battleship/
├── web-app/
│   ├── Battleship.js      # Pure game logic module (no DOM)
│   ├── main.js            # Web app controller (no game logic)
│   ├── index.html         # Semantic HTML structure
│   ├── default.css        # All styling
│   ├── images.js          # Ship images (base64 encoded)
│   ├── avatars.js         # Avatar images (base64 encoded)
│   └── tests/
│       └── Battleship.test.js  # Behavioural unit tests
└── docs/                  # Auto-generated API documentation
```

## Notes on images

Ship and avatar images are embedded as base64 data URIs in `images.js` and `avatars.js`. This avoids cross-origin issues when serving the app locally and means no external assets are needed beyond `npm install`.

## Credits

Ship images: Lego Star Wars fan builds (personal use).
Avatar images: Lego Star Wars character icons (personal use).
Logo: original design.
Built with [Mocha](https://mochajs.org/) (testing) and [JSDoc](https://jsdoc.app/) + [Docdash](https://github.com/clenemt/docdash) (API documentation).
