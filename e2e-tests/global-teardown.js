// Call all the functions in the global `teardowns` array, and wait for any promises from those calls.
module.exports = () => Promise.all(global.teardowns.map(f => f()))
