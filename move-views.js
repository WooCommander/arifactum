const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const moves = [
    { from: 'src/views/CategoryView.vue', to: 'src/modules/catalog/views/CategoryView.vue' },
    { from: 'src/views/ProductView.vue', to: 'src/modules/catalog/views/ProductView.vue' },
    { from: 'src/views/SearchView.vue', to: 'src/modules/catalog/views/SearchView.vue' },
    { from: 'src/views/StoreView.vue', to: 'src/modules/catalog/views/StoreView.vue' },
    { from: 'src/views/QuickCalcView.vue', to: 'src/modules/prices/views/QuickCalcView.vue' },
    { from: 'src/views/ShoppingListView.vue', to: 'src/modules/shopping/views/ShoppingListView.vue' },
    { from: 'src/views/ProfileView.vue', to: 'src/modules/profile/views/ProfileView.vue' },
]

for (const { from, to } of moves) {
    const dir = path.dirname(to)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    if (fs.existsSync(from)) {
        console.log(`Moving ${from} -> ${to}`)
        execSync(`git mv "${from}" "${to}"`)
    } else {
        console.log(`File not found: ${from}`)
    }
}
console.log('Done.')
