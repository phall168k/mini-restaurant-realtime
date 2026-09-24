<script setup lang="ts">
import type { ISignIn } from '~/types/sign-in';
import logo from '~/assets/images/logo/logo.png';

  definePageMeta({
    layout: 'auth',
  });

  const formData = ref<ISignIn>({
    username: '',
    password: '',
  });

  const auth = useAuthStore();
  const loading = ref<boolean>(false);
  const signIn = async () => {
    loading.value = true;
    try {
      await auth.handleSignIn(formData.value);
    } catch (error) {
      console.log(error);
    } finally {
      loading.value = false;
    }
  }


</script>

<template>
  <div class="w-full h-screen flex items-center justify-center"> 
    <el-form
      :model="formData"
      label-position="top"
      label-width="auto"
      class="w-[90%] md:w-[30%] rounded-md border p-5"
      @submit.prevent="signIn"
    >
      <el-form-item>
        <el-image
          :src="logo"
          class="h-[100px] mx-auto"
        />
      </el-form-item>
      <el-form-item
        :label="$t('sign_in.username')"
        :rules="[
          {
            required: true,
          }
        ]"
      >
        <el-input
          v-model="formData.username"
          :placeholder="$t('sign_in.username')"
          clearable
        >
          <template #prefix>
            <Icon name="boxicons:user-square"/>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item
        :label="$t('sign_in.password')"
        :rules="[
          {
            required: true,
          }
        ]"
      >
        <el-input
          type="password"
          v-model="formData.password"
          :placeholder="$t('sign_in.password')"
          clearable
        >
          <template #prefix>
            <Icon name="bytesize:lock"/>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <div class="flex items-center justify-end w-full">
          <NuxtLink class="text-blue-400">{{ $t('sign_in.forgot_password') }}</NuxtLink>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button 
          class="w-full" 
          type="primary" 
          native-type="submit"
          :disabled="loading"
        >
          <Icon
            v-if="loading"
            name="eos-icons:bubble-loading"
          />
          <span v-else>{{ $t('sign_in.sign_in') }}</span>
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>