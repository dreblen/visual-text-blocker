<template>
  <v-app>
    <v-app-bar
      app
      dark
      color="primary"
      :hide-on-scroll="true"
    >
      <v-app-bar-nav-icon @click.stop="navOpen = !navOpen" />
      <v-btn v-if="$route.path !== '/'" icon to="/">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-spacer />
      <v-btn icon @click.stop="undo" :disabled="!canUndo">
        <v-icon>mdi-undo</v-icon>
      </v-btn>
      <v-btn icon @click.stop="redo" :disabled="!canRedo">
        <v-icon>mdi-redo</v-icon>
      </v-btn>
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
        <v-list-item to="preferences">
          <v-list-item-icon>
            <v-icon>mdi-cogs</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            Preferences
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
import { mapGetters } from 'vuex'
import { saveAs } from 'file-saver'

export default {
  data: () => ({
    navOpen: false
  }),
  computed: {
    ...mapGetters([
      'serializedLayers',
      'canUndo',
      'canRedo'
    ])
  },
  methods: {
    undo: function () {
      this.$store.dispatch('undo')
    },
    redo: function () {
      this.$store.dispatch('redo')
    },
    exportData: function () {
      saveAs(new Blob([JSON.stringify(this.serializedLayers)], { type: 'text/plain;charset=utf-8' }), 'export.txt')
      this.navOpen = false
    },
    resetState: function () {
      this.$store.dispatch('reset')
      this.navOpen = false
    }
  }
}
</script>
