node_modules/.bin/standard --fix && \
node_modules/.bin/nyc npm test && \
node_modules/.bin/nyc report --reporter=html && \
node_modules/.bin/nyc report --reporter lcovonly && \
node_modules/.bin/codecov -t e2ddf5d0-f0e1-4656-87d0-b84446700c82
