node_modules/.bin/standard --fix && \
node_modules/.bin/nyc npm test && \
node_modules/.bin/nyc report --reporter=html && \
node_modules/.bin/nyc report --reporter lcovonly && \
cp lib/*.js ../chimera-cms/node_modules/chimera-framework/lib/ && \
node ../chimera-cms/test.js
