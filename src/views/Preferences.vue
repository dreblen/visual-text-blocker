<template>
  <v-container>
    <v-row v-for="(pref, name) in preferences" :key="name">
      <v-col>
        <template v-if="pref.type === Boolean">
          <v-switch
            v-model="pref.value"
            :label="pref.description"
            @change="booleanChanged(name, pref.value)"
          />
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'preferences',
  computed: {
    ...mapState([
      'preferences'
    ])
  },
  methods: {
    booleanChanged: function (name, value) {
      this.$store.commit('setPreference', {
        name,
        value
      })
    }
  }
}
</script>
