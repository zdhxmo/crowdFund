# CrowdFund

Start a testnet with Ganache on port 8545 (http://localhost:8545)

To compile and migrate the contracts onto testnet:

```
truffle migrate
```

To run unit tests:

```
truffle test
```

## Getting Started with the frontend

First, run the development server:

```
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.


## Flow of Txs

1. Creator creates a new project
2. Contributors contribute until deadline
3. If total pledged doesn't get met on deadline date, contributors expire the project and get refund back
4. If total pledged reaches the goal, creator decalres the fundraise a success
	a. Creator makes a withdrawal request
	b. contributors vote on the request
	c. if approved, creator withdraws the amount requested to work on the project


## TODO: add support for wei denominations. also floating points. currently users can only submit uint ETH, which is stupid
