import { useState } from "react";
import { ActivityIndicator, Button, Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";
import { useLogin } from "../../src/features/auth";

export default function Login() {
  const [phone, setPhone] = useState('13800138000');
  const [code, setCode] = useState('1234');
  
  // 使用自定义 Hook
  const loginMutation = useLogin();

  const handleLogin = () => {
    loginMutation.mutate({ phone, code });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>用户登录</Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="手机号"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="验证码"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          
          {loginMutation.isPending ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <Button title="登录" onPress={handleLogin} />
          )}
          
          {loginMutation.isError && (
            <Text style={styles.errorText}>
              发生错误: {loginMutation.error?.message}
            </Text>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  form: {
    width: '100%',
    maxWidth: 300,
    gap: 15,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  }
});
