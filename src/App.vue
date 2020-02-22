<template>
  <v-app>
    <v-app-bar
      app
      dark
      color="primary"
      :hide-on-scroll="true"
    >
      <v-app-bar-nav-icon @click.stop="navOpen = !navOpen" />
    </v-app-bar>
    <v-navigation-drawer
      v-model="navOpen"
      app
    >
      <v-list>
        <v-list-item @click="exportData" :disabled="!$root.layers">
          <v-list-item-icon>
            <v-icon>mdi-export</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            Export
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-content>
      <router-view />
    </v-content>
  </v-app>
</template>
<script>
import { saveAs } from 'file-saver'

export default {
  data: () => ({
    navOpen: false
  }),
  methods: {
    exportData: function () {
      let layers = this.$root.layers
      let serialized = layers.map((layer) => {
        return layer.serialize()
      })
      saveAs(new Blob([JSON.stringify(serialized)], { type: 'text/plain;charset=utf-8' }), 'export.txt')
      this.navOpen = false
    }
  }
}
</script>
