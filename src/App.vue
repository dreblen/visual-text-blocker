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
        <v-list-item @click="exportData" :disabled="$store.state.layers.length === 0">
          <v-list-item-icon>
            <v-icon>mdi-export</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            Export
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="resetState">
          <v-list-item-icon>
            <v-icon>mdi-restart</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            Start Over
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
      let serialized = this.$store.state.layers.map((layer) => {
        return layer.serialize()
      })
      saveAs(new Blob([JSON.stringify(serialized)], { type: 'text/plain;charset=utf-8' }), 'export.txt')
      this.navOpen = false
    },
    resetState: function () {
      this.$store.commit('reset')
      this.navOpen = false
    }
  }
}
</script>
