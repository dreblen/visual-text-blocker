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
            <template v-else-if="pref.type === 'color'">
              <v-btn
                :color="pref.value"
                @click="dialogPendingAction = () => { preferenceChanged(groupName, name, selectedColor); shouldShowColorPicker = false; }; selectedColor = pref.value; shouldShowColorPicker = true"
                class="white--text"
                block
              >
                {{ name }}
              </v-btn>
            </template>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-dialog
      v-model="shouldShowColorPicker"
      max-width="400"
    >
      <v-card>
        <v-card-title>
          Select Color
        </v-card-title>
        <v-card-text class="text-center">
          <v-color-picker
            v-model="selectedColor"
            :hide-inputs="true"
            style="margin: auto;"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn @click="selectedColor = null; dialogPendingAction()">Reset to Default</v-btn>
          <v-spacer />
          <v-btn @click="dialogPendingAction">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'preferences',
  data: () => ({
    dialogPendingAction: null,
    shouldShowColorPicker: false,
    selectedColor: null
  }),
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
