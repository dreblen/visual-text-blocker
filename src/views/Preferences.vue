<template>
  <v-container>
    <v-row v-for="(prefGroup, groupName) in preferences" :key="groupName">
      <v-col>
        <h2 v-if="prefGroup.description">
          {{ prefGroup.description }}
        </h2>
        <v-row v-for="(pref, name) in prefGroup.settings" :key="name">
          <v-col>
            <template v-if="pref.type === 'boolean'">
              <v-switch
                v-model="pref.value"
                :label="pref.description"
                @change="preferenceChanged(groupName, name, pref.value)"
              />
            </template>
          </v-col>
        </v-row>
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
    preferenceChanged: function (groupName, name, value) {
      this.$store.commit('setPreference', {
        groupName,
        name,
        value
      })
    }
  }
}
</script>
